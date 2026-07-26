import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import { Attachment } from './entities/attachment.entity';
import { Grievance } from '../grievances/entities/grievance.entity';
import { Message } from '../messages/entities/message.entity';
import { Role } from 'src/common/enums';

@Injectable()
export class AttachmentsService {
  constructor(
    @InjectRepository(Attachment)
    private readonly attachmentRepo: Repository<Attachment>,
    @InjectRepository(Grievance)
    private readonly grievanceRepo: Repository<Grievance>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
  ) {}

  async create(
    grievanceId: string,
    file: Express.Multer.File,
    messageId: string | undefined,
    uploader: { id: string; role: Role },
  ): Promise<Attachment> {
    const grievance = await this.grievanceRepo.findOne({
      where: { id: grievanceId },
    });
    if (!grievance) {
      throw new NotFoundException(`Grievance ${grievanceId} not found`);
    }

    if (messageId) {
      const message = await this.messageRepo.findOne({
        where: { id: messageId },
      });
      if (!message || message.grievanceId !== grievanceId) {
        // Same 400 for both "message doesn't exist" and "message belongs to a
        // different grievance" — don't leak which case it was.
        throw new BadRequestException(
          'Message does not belong to this grievance',
        );
      }
      if (uploader.role !== Role.ADMIN && message.authorId !== uploader.id) {
        // Same 400 shape here too — INV-10: don't reveal internal-note existence
        // via a differently-worded error.
        throw new BadRequestException(
          'You can only attach files to your own messages',
        );
      }
    }

    return this.attachmentRepo.save(
      this.attachmentRepo.create({
        grievanceId,
        messageId,
        uploadedById: uploader.id,
        fileName: file.originalname,
        storagePath: file.path,
        mimeType: file.mimetype,
        sizeBytes: String(file.size),
      }),
    );
  }

  async listForGrievance(
    grievanceId: string,
    actor: { id: string; role: Role },
  ): Promise<Attachment[]> {
    const grievance = await this.grievanceRepo.findOne({
      where: { id: grievanceId },
    });
    if (!grievance) throw new NotFoundException('Grievance not found');

    if (actor.role === Role.CITIZEN && grievance.citizenId !== actor.id) {
      throw new NotFoundException('Grievance not found'); // INV-9 pattern: 404, not 403
    }

    const qb = this.attachmentRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.message', 'm')
      .where('a.grievanceId = :grievanceId', { grievanceId });

    if (actor.role === Role.CITIZEN) {
      // INV-8/INV-10: citizens see general attachments (messageId IS NULL)
      // and attachments on non-internal messages, never internal notes.
      qb.andWhere('(a.messageId IS NULL OR m.isInternal = false)');
    }

    return qb.getMany();
  }

  async findForDownload(
    attachmentId: string,
    actor: { id: string; role: Role },
  ): Promise<Attachment> {
    const attachment = await this.attachmentRepo.findOne({
      where: { id: attachmentId },
      relations: { message: true, grievance: true },
    });
    if (!attachment) throw new NotFoundException('Attachment not found');

    if (actor.role === Role.CITIZEN) {
      if (attachment.grievance.citizenId !== actor.id) {
        throw new NotFoundException('Attachment not found');
      }
      if (attachment.message?.isInternal) {
        throw new NotFoundException('Attachment not found'); // hide internal-note attachments
      }
    }
    if (
      actor.role === Role.OFFICER &&
      attachment.grievance.assignedOfficerId !== actor.id
    ) {
      throw new ForbiddenException('Officer is not assigned to this grievance');
    }

    if (!fs.existsSync(attachment.storagePath)) {
      throw new NotFoundException('File no longer exists on disk');
    }

    return attachment;
  }

  async remove(
    attachmentId: string,
    actor: { id: string; role: Role },
  ): Promise<void> {
    const attachment = await this.attachmentRepo.findOne({
      where: { id: attachmentId },
    });
    if (!attachment) throw new NotFoundException('Attachment not found');

    if (actor.role !== Role.ADMIN && attachment.uploadedById !== actor.id) {
      throw new ForbiddenException('You can only delete your own attachments');
    }

    if (fs.existsSync(attachment.storagePath)) {
      fs.unlinkSync(attachment.storagePath);
    }
    await this.attachmentRepo.remove(attachment);
  }
}