import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import type { Response, Request } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums';
import { toUserResponse } from 'src/common/utils/to-safe-user.util';
import { AttachmentsService } from './attachments.service';

interface AuthenticatedRequest extends Request {
  user: ReturnType<typeof toUserResponse>;
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller()
export class AttachmentsController {
  constructor(private readonly service: AttachmentsService) {}

  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
      required: ['file'],
    },
  })
  @Post('grievances/:grievanceId/attachments')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (_req, file, cb) => {
          cb(null, `${randomUUID()}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          cb(new BadRequestException('File type not allowed'), false);
          return;
        }
        cb(null, true);
      },
    }),
  )
  upload(
    @Param('grievanceId', ParseUUIDPipe) grievanceId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('messageId') messageId: string | undefined,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.service.create(grievanceId, file, messageId, {
      id: req.user.id,
      role: req.user.role,
    });
  }

  @Get('grievances/:grievanceId/attachments')
  list(
    @Param('grievanceId', ParseUUIDPipe) grievanceId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.listForGrievance(grievanceId, {
      id: req.user.id,
      role: req.user.role,
    });
  }

  @Get('attachments/:id')
  async download(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    const attachment = await this.service.findForDownload(id, {
      id: req.user.id,
      role: req.user.role,
    });
    res.download(attachment.storagePath, attachment.fileName);
  }

  @Delete('attachments/:id')
  remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthenticatedRequest) {
    return this.service.remove(id, {
      id: req.user.id,
      role: req.user.role,
    });
  }
}