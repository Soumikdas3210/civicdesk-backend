import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../app.module';
import { UsersService } from '../users/users.service';
import { DepartmentsService } from '../departments/departments.service';
import { WardsService } from '../wards/wards.service';
import { CategoriesService } from '../categories/categories.service';
import { SlaService } from '../sla/sla.service';
import { GrievancesService } from '../grievances/grievances.service';
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

  logger.log('Seeding admin...');
  await usersService.createUser({
    email: 'admin@civicdesk.local',
    password: 'AdminPass1!',
    fullName: 'System Admin',
    role: Role.ADMIN,
  });

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
    categoryId: powerOutage.id,
    priority: Priority.URGENT,
    responseDueHours: 1,
    resolutionDueHours: 6,
  });

  logger.log('Seeding officers...');
  const officer1 = await usersService.createUser({
    email: 'karim@city.gov',
    password: 'OfficerPass1!',
    fullName: 'Karim Hossain',
    phone: '01700000002',
    role: Role.OFFICER,
  });
  await usersService.setDepartment(officer1.id, {
    departmentId: waterBoard.id,
  });
  await usersService.setWards(officer1.id, { wardIds: [ward12.id, ward7.id] });

  const officer2 = await usersService.createUser({
    email: 'fatima@city.gov',
    password: 'OfficerPass2!',
    fullName: 'Fatima Rahman',
    phone: '01700000003',
    role: Role.OFFICER,
  });
  await usersService.setDepartment(officer2.id, {
    departmentId: electricity.id,
  });
  await usersService.setWards(officer2.id, { wardIds: [ward3.id] });

  logger.log('Seeding citizens...');
  const citizen1 = await usersService.createUser({
    email: 'rina@example.com',
    password: 'CitizenPass1!',
    fullName: 'Rina Ahmed',
    phone: '01700000010',
    role: Role.CITIZEN,
  });
  const citizen2 = await usersService.createUser({
    email: 'sabbir@example.com',
    password: 'CitizenPass2!',
    fullName: 'Sabbir Islam',
    phone: '01700000011',
    role: Role.CITIZEN,
  });

  logger.log('Seeding grievances...');

  // 1. OPEN, unassigned, HIGH priority (has an SLA policy)
  const g1 = await grievancesService.create(
    {
      title: 'Burst pipe flooding the street',
      description:
        'Water has been pooling on the road for two days near the market.',
      categoryId: pipeLeak.id,
      wardId: ward12.id,
      priority: Priority.HIGH,
    },
    citizen1.id,
  );

  // 2. IN_PROGRESS: claimed and started by Karim
  const g2 = await grievancesService.create(
    {
      title: 'Low water pressure all week',
      description:
        'Pressure has been dropping every evening for the past week.',
      categoryId: pipeLeak.id,
      wardId: ward7.id,
      priority: Priority.MEDIUM,
    },
    citizen2.id,
  );
  await grievancesService.assign(
    g2.id,
    {},
    { id: officer1.id, role: Role.OFFICER },
  );
  await grievancesService.changeStatus(
    g2.id,
    { action: GrievanceAction.START },
    { id: officer1.id, role: Role.OFFICER },
  );

  // 3. WAITING_ON_CITIZEN: claimed, started, then info requested
  const g3 = await grievancesService.create(
    {
      title: 'Drain blocked near the school',
      description: 'Standing water outside the primary school gate.',
      categoryId: drainage.id,
      wardId: ward12.id,
    },
    citizen1.id,
  );
  await grievancesService.assign(
    g3.id,
    {},
    { id: officer1.id, role: Role.OFFICER },
  );
  await grievancesService.changeStatus(
    g3.id,
    { action: GrievanceAction.START },
    { id: officer1.id, role: Role.OFFICER },
  );
  await grievancesService.changeStatus(
    g3.id,
    { action: GrievanceAction.REQUEST_INFO },
    { id: officer1.id, role: Role.OFFICER },
  );

  // 4. RESOLVED: full cycle through Fatima
  const g4 = await grievancesService.create(
    {
      title: 'Power outage since this morning',
      description: 'No electricity since 6am, whole block affected.',
      categoryId: powerOutage.id,
      wardId: ward3.id,
      priority: Priority.URGENT,
    },
    citizen2.id,
  );
  await grievancesService.assign(
    g4.id,
    {},
    { id: officer2.id, role: Role.OFFICER },
  );
  await grievancesService.changeStatus(
    g4.id,
    { action: GrievanceAction.START },
    { id: officer2.id, role: Role.OFFICER },
  );
  await grievancesService.changeStatus(
    g4.id,
    { action: GrievanceAction.RESOLVE },
    { id: officer2.id, role: Role.OFFICER },
  );

  // 5. OPEN, unassigned, no SLA policy configured (proves the INV-4 fallback)
  const g5 = await grievancesService.create(
    {
      title: 'Streetlight flickering at night',
      description:
        'The streetlight on the corner has been flickering for a week.',
      categoryId: powerOutage.id,
      wardId: ward3.id,
      priority: Priority.LOW,
    },
    citizen1.id,
  );

  logger.log(
    `Seeded 5 grievances: ${[g1, g2, g3, g4, g5].map((g) => g.trackingCode).join(', ')}`,
  );
  logger.log('Seed complete.');

  await app.close();
}

bootstrap().catch((err) => {
  logger.error('Seed failed', err);
  process.exit(1);
});
