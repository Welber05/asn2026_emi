import {sqliteTable,text,integer,real,uniqueIndex,index} from 'drizzle-orm/sqlite-core';

export const classes=sqliteTable('classes',{id:text('id').primaryKey(),name:text('name').notNull(),grade:integer('grade').notNull(),year:integer('year').notNull(),createdAt:text('created_at').notNull(),active:integer('active').notNull().default(1)});

export const groups=sqliteTable('groups',{id:text('id').primaryKey(),classId:text('class_id').notNull().references(()=>classes.id),name:text('name').notNull(),startWeek:text('start_week').notNull(),createdAt:text('created_at').notNull(),active:integer('active').notNull().default(1)},t=>[uniqueIndex('groups_class_name').on(t.classId,t.name)]);

export const students=sqliteTable('students',{id:text('id').primaryKey(),classId:text('class_id').notNull().references(()=>classes.id),groupId:text('group_id').references(()=>groups.id),name:text('name').notNull(),createdAt:text('created_at').notNull(),active:integer('active').notNull().default(1)});

export const weeks=sqliteTable('weeks',{id:text('id').primaryKey(),classId:text('class_id').notNull().references(()=>classes.id),start:text('start').notNull(),dueAt:text('due_at').notNull(),createdAt:text('created_at').notNull()},t=>[uniqueIndex('weeks_class_start').on(t.classId,t.start)]);

export const reports=sqliteTable('reports',{id:text('id').primaryKey(),weekId:text('week_id').notNull().references(()=>weeks.id),groupId:text('group_id').notNull().references(()=>groups.id),past:text('past').notNull(),plan:text('plan').notNull(),delivery:text('delivery').notNull(),submittedAt:text('submitted_at'),importedAt:text('imported_at'),updatedAt:text('updated_at').notNull(),planCheckedAt:text('plan_checked_at'),status:text('status').notNull().default('pending'),percent:real('percent'),justification:text('justification').notNull().default(''),reviewedAt:text('reviewed_at'),evidence:text('evidence').notNull().default('')},t=>[uniqueIndex('reports_week_group').on(t.weekId,t.groupId)]);

export const tasks=sqliteTable('tasks',{id:text('id').primaryKey(),reportId:text('report_id').notNull().references(()=>reports.id),studentId:text('student_id').notNull().references(()=>students.id),description:text('description').notNull(),status:text('status').notNull(),percent:real('percent'),justification:text('justification').notNull().default(''),reviewedAt:text('reviewed_at'),evidence:text('evidence').notNull().default(''),updatedAt:text('updated_at').notNull()},t=>[index('tasks_report').on(t.reportId),uniqueIndex('tasks_report_student').on(t.reportId,t.studentId)]);

export const audit=sqliteTable('audit',{id:text('id').primaryKey(),entity:text('entity').notNull(),entityId:text('entity_id').notNull(),action:text('action').notNull(),at:text('at').notNull(),details:text('details').notNull()});

export const rubrics=sqliteTable('rubrics',{id:text('id').primaryKey(),classId:text('class_id').notNull().references(()=>classes.id),total:real('total').notNull(),config:text('config').notNull(),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull()},t=>[uniqueIndex('rubrics_class').on(t.classId)]);

export const evaluators=sqliteTable('evaluators',{id:text('id').primaryKey(),classId:text('class_id').notNull().references(()=>classes.id),name:text('name').notNull(),email:text('email').notNull(),createdAt:text('created_at').notNull(),active:integer('active').notNull().default(1)},t=>[uniqueIndex('evaluators_class_email').on(t.classId,t.email)]);

export const assignments=sqliteTable('assignments',{id:text('id').primaryKey(),groupId:text('group_id').notNull().references(()=>groups.id),stage:text('stage').notNull(),evaluatorId:text('evaluator_id').notNull().references(()=>evaluators.id),active:integer('active').notNull().default(1)},t=>[uniqueIndex('assignments_panel').on(t.groupId,t.stage,t.evaluatorId)]);

export const files=sqliteTable('files',{id:text('id').primaryKey(),groupId:text('group_id').notNull().references(()=>groups.id),name:text('name').notNull(),key:text('key').notNull(),size:integer('size').notNull(),uploadedAt:text('uploaded_at').notNull()});

export const assessments=sqliteTable('assessments',{id:text('id').primaryKey(),assignmentId:text('assignment_id').notNull().references(()=>assignments.id),fileId:text('file_id'),scores:text('scores').notNull(),percent:real('percent').notNull(),notes:text('notes').notNull(),submittedAt:text('submitted_at').notNull()},t=>[index('assessments_assignment').on(t.assignmentId)]);

export const settings=sqliteTable('settings',{key:text('key').primaryKey(),value:text('value').notNull()});
export const representatives=sqliteTable('representatives',{id:text('id').primaryKey(),groupId:text('group_id').notNull().references(()=>groups.id),name:text('name').notNull(),email:text('email').notNull(),active:integer('active').notNull().default(1),createdAt:text('created_at').notNull()},t=>[uniqueIndex('representatives_group_email').on(t.groupId,t.email)]);
export const participation=sqliteTable('participation',{id:text('id').primaryKey(),reportId:text('report_id').notNull().references(()=>reports.id),mode:text('mode').notNull(),scores:text('scores').notNull(),percentages:text('percentages').notNull(),submittedBy:text('submitted_by').notNull(),submittedAt:text('submitted_at').notNull()},t=>[index('participation_report').on(t.reportId)]);
export const appUsers=sqliteTable('app_users',{id:text('id').primaryKey(),email:text('email').notNull().unique(),name:text('name').notNull(),passwordHash:text('password_hash').notNull(),role:text('role').notNull(),permissions:text('permissions').notNull(),status:text('status').notNull().default('pending'),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull()});
export const appSessions=sqliteTable('app_sessions',{tokenHash:text('token_hash').primaryKey(),userId:text('user_id').notNull().references(()=>appUsers.id,{onDelete:'cascade'}),expiresAt:integer('expires_at').notNull()},t=>[index('sessions_user').on(t.userId)]);
export const loginLimits=sqliteTable('login_limits',{key:text('key').primaryKey(),attempts:integer('attempts').notNull(),until:integer('until').notNull()});
