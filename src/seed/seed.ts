import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppModule } from '../app.module';
import { UsersService } from '../users/users.service';
import { DepartmentsService } from '../departments/departments.service';
import { WardsService } from '../wards/wards.service';
import { CategoriesService } from '../categories/categories.service';
import { SlaService } from '../sla/sla.service';
import { GrievancesService } from '../grievances/grievances.service';
import { MessagesService } from '../messages/messages.service';
import { Role, Priority, GrievanceAction } from '../common/enums';

const logger = new Logger('Seed');

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const usersService = app.get(UsersService);
  const departmentsService = app.get(DepartmentsService);
  const wardsService = app.get(WardsService);
  const categoriesService = app.get(CategoriesService);
  const slaService = app.get(SlaService);
  const grievancesService = app.get(GrievancesService);
  const messagesService = app.get(MessagesService);
  const dataSource = app.get(DataSource);

  logger.log('Resetting the tracking code sequence...');
  await dataSource.query(
    `ALTER SEQUENCE grievance_tracking_seq RESTART WITH 1`,
  );

  logger.log('Seeding admin...');
  const admin = await usersService.createUser({
    email: 'admin@civicdesk.local',
    password: 'AdminPass1!',
    fullName: 'System Admin',
    role: Role.ADMIN,
  });
  const asAdmin = { id: admin.id, role: Role.ADMIN };

  logger.log('Seeding departments...');
  const waterBoard = await departmentsService.create({
    name: 'Water Board',
    description: 'Handles water supply, pipe leaks, and drainage',
  });
  const electricity = await departmentsService.create({
    name: 'Electricity Board',
    description: 'Handles power outages and electrical faults',
  });

  logger.log('Seeding wards...');
  const ward12 = await wardsService.create({
    name: 'Ward 12, Riverside District',
    code: 'W-12',
  });
  const ward7 = await wardsService.create({
    name: 'Ward 7, Central District',
    code: 'W-07',
  });
  const ward3 = await wardsService.create({
    name: 'Ward 3, North District',
    code: 'W-03',
  });

  logger.log('Seeding categories...');
  const pipeLeak = await categoriesService.create({
    name: 'Pipe Leak',
    description: 'Burst or leaking water pipes',
    departmentId: waterBoard.id,
  });
  const drainage = await categoriesService.create({
    name: 'Drainage Blockage',
    description: 'Blocked or overflowing drains',
    departmentId: waterBoard.id,
  });
  const powerOutage = await categoriesService.create({
    name: 'Power Outage',
    description: 'Unplanned electricity outages',
    departmentId: electricity.id,
  });

  logger.log('Seeding SLA policies...');
  await slaService.create({
    categoryId: pipeLeak.id,
    priority: Priority.HIGH,
    responseDueHours: 4,
    resolutionDueHours: 24,
  });
  await slaService.create({
    categoryId: pipeLeak.id,
    priority: Priority.MEDIUM,
    responseDueHours: 12,
    resolutionDueHours: 48,
  });
  await slaService.create({
    categoryId: drainage.id,
    priority: Priority.MEDIUM,
    responseDueHours: 24,
    resolutionDueHours: 72,
  });
  await slaService.create({
    categoryId: powerOutage.id,
    priority: Priority.URGENT,
    responseDueHours: 1,
    resolutionDueHours: 6,
  });
  await slaService.create({
    categoryId: powerOutage.id,
    priority: Priority.MEDIUM,
    responseDueHours: 8,
    resolutionDueHours: 36,
  });

  logger.log('Seeding officers...');
  const karim = await usersService.createUser({
    email: 'karim@city.gov',
    password: 'OfficerPass1!',
    fullName: 'Karim Hossain',
    phone: '01700000002',
    role: Role.OFFICER,
  });
  await usersService.setDepartment(karim.id, { departmentId: waterBoard.id });
  await usersService.setWards(karim.id, {
    wardIds: [ward12.id, ward7.id, ward3.id],
  });

  const fatima = await usersService.createUser({
    email: 'fatima@city.gov',
    password: 'OfficerPass2!',
    fullName: 'Fatima Rahman',
    phone: '01700000003',
    role: Role.OFFICER,
  });
  await usersService.setDepartment(fatima.id, { departmentId: electricity.id });
  await usersService.setWards(fatima.id, {
    wardIds: [ward12.id, ward7.id, ward3.id],
  });

  const nadia = await usersService.createUser({
    email: 'nadia@city.gov',
    password: 'OfficerPass3!',
    fullName: 'Nadia Chowdhury',
    phone: '01700000004',
    role: Role.OFFICER,
  });
  await usersService.setDepartment(nadia.id, { departmentId: waterBoard.id });
  await usersService.setWards(nadia.id, { wardIds: [ward7.id] });

  const asKarim = { id: karim.id, role: Role.OFFICER };
  const asFatima = { id: fatima.id, role: Role.OFFICER };

  logger.log('Seeding citizens...');
  const rina = await usersService.createUser({
    email: 'rina@example.com',
    password: 'CitizenPass1!',
    fullName: 'Rina Ahmed',
    phone: '01700000010',
    role: Role.CITIZEN,
  });
  const sabbir = await usersService.createUser({
    email: 'sabbir@example.com',
    password: 'CitizenPass2!',
    fullName: 'Sabbir Islam',
    phone: '01700000011',
    role: Role.CITIZEN,
  });
  const asRina = { id: rina.id, role: Role.CITIZEN };
  const asSabbir = { id: sabbir.id, role: Role.CITIZEN };

  // A citizen cannot set priority, so the seed raises it the way a real
  // officer would: through escalate, which also records an audit row.
  async function raisePriority(id: string, to: Priority) {
    await grievancesService.escalate(id, { targetPriority: to }, asAdmin);
  }

  // Deadlines are always computed from createdAt (INV-4), so moving createdAt
  // back and recomputing produces a genuinely overdue complaint rather than a
  // faked breach flag. The scanner still owns the flags.
  async function backdate(id: string, days: number) {
    await dataSource.query(
      `UPDATE grievances SET "createdAt" = now() - ($2 || ' days')::interval WHERE id = $1`,
      [id, String(days)],
    );
    const g = await grievancesService.findRawById(id);
    if (!g) return;
    const d = await slaService.computeDeadlines(
      g.categoryId,
      g.priority,
      g.createdAt,
    );
    g.responseDueAt = d.responseDueAt;
    g.resolutionDueAt = d.resolutionDueAt;
    await grievancesService.saveRaw(g);
  }

  logger.log('Seeding grievances...');

  // 1. OPEN, unassigned, HIGH, overdue. The assign demo starts here.
  const g1 = await grievancesService.create(
    {
      title: 'Burst pipe flooding the street',
      description:
        'Water has been pooling on the road for two days near the market and cars cannot pass.',
      categoryId: pipeLeak.id,
      wardId: ward12.id,
    },
    asRina,
  );
  await raisePriority(g1.id, Priority.HIGH);
  await backdate(g1.id, 4);

  // 2. IN_PROGRESS with a public reply, so the thread is not empty.
  const g2 = await grievancesService.create(
    {
      title: 'Low water pressure every evening',
      description:
        'Pressure drops to nothing after 7pm for the past week across the whole building.',
      categoryId: pipeLeak.id,
      wardId: ward7.id,
    },
    asSabbir,
  );
  await grievancesService.assign(g2.id, {}, asKarim);
  await grievancesService.changeStatus(
    g2.id,
    { action: GrievanceAction.START },
    asKarim,
  );
  await messagesService.postMessage(
    g2.id,
    { body: 'Thank you for reporting this. A crew is checking the main line tomorrow morning.' },
    asKarim,
  );
  await messagesService.postMessage(
    g2.id,
    { body: 'Mains valve looks corroded. Ordering a replacement.', isInternal: true },
    asKarim,
  );

  // 3. WAITING_ON_CITIZEN, with the question that put it there.
  const g3 = await grievancesService.create(
    {
      title: 'Drain blocked outside the primary school',
      description:
        'Standing water outside the school gate for three days. Children walk through it.',
      categoryId: drainage.id,
      wardId: ward12.id,
    },
    asRina,
  );
  await grievancesService.assign(g3.id, {}, asKarim);
  await grievancesService.changeStatus(
    g3.id,
    { action: GrievanceAction.START },
    asKarim,
  );
  await messagesService.postMessage(
    g3.id,
    { body: 'Could you tell us which side of the gate the water collects on?' },
    asKarim,
  );
  await grievancesService.changeStatus(
    g3.id,
    { action: GrievanceAction.REQUEST_INFO },
    asKarim,
  );

  // 4. RESOLVED, URGENT. The citizen can reopen this one in the demo.
  const g4 = await grievancesService.create(
    {
      title: 'Power outage since this morning',
      description:
        'No electricity since 6am. The whole block is affected including the clinic.',
      categoryId: powerOutage.id,
      wardId: ward3.id,
    },
    asSabbir,
  );
  await raisePriority(g4.id, Priority.URGENT);
  await grievancesService.assign(g4.id, {}, asFatima);
  await grievancesService.changeStatus(
    g4.id,
    { action: GrievanceAction.START },
    asFatima,
  );
  await messagesService.postMessage(
    g4.id,
    { body: 'A transformer fuse had blown. Power was restored at 2pm.' },
    asFatima,
  );
  await grievancesService.changeStatus(
    g4.id,
    { action: GrievanceAction.RESOLVE },
    asFatima,
  );

  // 5. REOPENED. The citizen disagreed, which cleared resolvedAt and set a
  // fresh resolution deadline from the reopen (INV-5).
  const g5 = await grievancesService.create(
    {
      title: 'Streetlight flickering all night',
      description:
        'The light on the corner flickers constantly and the street is dark between flashes.',
      categoryId: powerOutage.id,
      wardId: ward12.id,
    },
    asRina,
  );
  await grievancesService.assign(g5.id, {}, asFatima);
  await grievancesService.changeStatus(
    g5.id,
    { action: GrievanceAction.START },
    asFatima,
  );
  await grievancesService.changeStatus(
    g5.id,
    { action: GrievanceAction.RESOLVE },
    asFatima,
  );
  await messagesService.postMessage(
    g5.id,
    { body: 'It is still flickering. Nothing has changed since you closed it.' },
    asRina,
  );
  await grievancesService.changeStatus(
    g5.id,
    { action: GrievanceAction.REOPEN },
    asRina,
  );

  // 6. CLOSED. Terminal, and the citizen cannot reopen it.
  const g6 = await grievancesService.create(
    {
      title: 'Manhole cover missing on the service road',
      description:
        'The cover has been gone for a week and the hole is not marked at night.',
      categoryId: drainage.id,
      wardId: ward7.id,
    },
    asSabbir,
  );
  await grievancesService.assign(g6.id, {}, asKarim);
  await grievancesService.changeStatus(
    g6.id,
    { action: GrievanceAction.START },
    asKarim,
  );
  await grievancesService.changeStatus(
    g6.id,
    { action: GrievanceAction.RESOLVE },
    asKarim,
  );
  await grievancesService.changeStatus(
    g6.id,
    { action: GrievanceAction.CLOSE },
    asAdmin,
  );

  // 7. OPEN, unassigned, LOW, no SLA policy for this pair. Proves the INV-4
  // fallback still produces non-null deadlines.
  const g7 = await grievancesService.create(
    {
      title: 'Water meter cover cracked',
      description:
        'The plastic cover on the meter outside my house has split but nothing is leaking.',
      categoryId: pipeLeak.id,
      wardId: ward3.id,
    },
    asRina,
  );

  // 8. OPEN, unassigned, badly overdue. The breach demo.
  const g8 = await grievancesService.create(
    {
      title: 'Sewage smell near the bus stand',
      description:
        'A strong smell has been coming from the drain by the bus stand for over a week.',
      categoryId: drainage.id,
      wardId: ward7.id,
    },
    asSabbir,
  );
  await backdate(g8.id, 9);

  const codes = [g1, g2, g3, g4, g5, g6, g7, g8].map((g) => g.trackingCode);
  logger.log(`Seeded 8 grievances: ${codes.join(', ')}`);
  logger.log('Seed complete.');

  await app.close();
}

bootstrap().catch((err) => {
  logger.error('Seed failed', err);
  process.exit(1);
});