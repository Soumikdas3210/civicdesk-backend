import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/adapters/handlebars.adapter';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';
import { MailService } from './mail.service';

@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        transport: {
          host: cfg.get('MAIL_HOST'), port: +cfg.get('MAIL_PORT'),
          auth: { user: cfg.get('MAIL_USER'), pass: cfg.get('MAIL_PASSWORD') },
        },
        defaults: { from: cfg.get('MAIL_FROM') },
        template: { dir: join(__dirname, 'templates'), adapter: new HandlebarsAdapter(), options: { strict: true } },
      }),
    }),
  ],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}