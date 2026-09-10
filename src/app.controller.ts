import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller()
export class AppController {
  @ApiOperation({
    summary: 'Service health. Public, and deliberately says nothing else.',
  })
  @Get()
  health() {
    return { status: 'ok', name: 'CivicDesk API' };
  }

  @ApiOperation({ summary: 'The same status, on a path the frontend can proxy.' })
  @Get('health')
  healthNamed() {
    return this.health();
  }
}