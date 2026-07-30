import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { toUserResponse } from 'src/common/utils/to-safe-user.util';

interface AuthenticatedRequest extends Request {
  user: ReturnType<typeof toUserResponse>;
}

@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('grievances')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post(':id/messages')
  postMessage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateMessageDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.messagesService.postMessage(id, dto, {
      id: req.user.id,
      role: req.user.role,
    });
  }

  @Get(':id/messages')
  findThread(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthenticatedRequest) {
    return this.messagesService.findThread(id, {
      id: req.user.id,
      role: req.user.role,
    });
  }
}
