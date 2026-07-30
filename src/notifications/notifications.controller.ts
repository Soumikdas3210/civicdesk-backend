import { Controller, Get, Patch, Param, Query, UseGuards, Req, ParseUUIDPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotificationsService } from './notifications.service';

@UseGuards(AuthGuard('jwt'))
@Controller('notifications')
export class NotificationsController {
  constructor(private service: NotificationsService) {}

  // IMPORTANT: literal route 'read-all' must be declared BEFORE ':id/read'
  @Patch('read-all')
  markAllRead(@Req() req) {
    return this.service.markAllRead(req.user.id);
  }

  @Get()
  list(
    @Req() req,
    @Query('isRead') isRead?: string,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.service.list(req.user.id, isRead, +page, +limit);
  }

  @Patch(':id/read')
  markRead(@Req() req, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.markRead(req.user.id, id);
  }
}