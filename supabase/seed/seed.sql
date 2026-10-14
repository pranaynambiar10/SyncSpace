-- ============================================================================
-- SyncSpace Campus — Initial Master Seed Data
-- ============================================================================

-- 1. University: CUSAT
INSERT INTO public.universities (id, name, slug, country, is_active)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Cochin University of Science and Technology',
  'cusat',
  'India',
  true
) ON CONFLICT (slug) DO NOTHING;

-- 2. Allowed Email Domains (CUSAT Domains)
INSERT INTO public.allowed_email_domains (university_id, domain, label, is_active)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'ug.cusat.ac.in', 'CUSAT Undergraduate Students', true),
  ('11111111-1111-1111-1111-111111111111', 'pg.cusat.ac.in', 'CUSAT Postgraduate Students', true),
  ('11111111-1111-1111-1111-111111111111', 'cusat.ac.in', 'CUSAT Faculty & Staff', true)
ON CONFLICT (domain) DO NOTHING;

-- 3. Departments
INSERT INTO public.departments (id, university_id, name, code, is_active)
VALUES
  ('22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111111', 'Department of Computer Applications (DCA)', 'DCA', true),
  ('22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111111', 'Department of Computer Science (DCS)', 'DCS', true),
  ('22222222-2222-2222-2222-222222222203', '11111111-1111-1111-1111-111111111111', 'School of Engineering - IT', 'SOE-IT', true),
  ('22222222-2222-2222-2222-222222222204', '11111111-1111-1111-1111-111111111111', 'School of Engineering - CS', 'SOE-CS', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Semesters (S1 to S8)
INSERT INTO public.semesters (university_id, label, sort_order, is_active)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Semester 1', 1, true),
  ('11111111-1111-1111-1111-111111111111', 'Semester 2', 2, true),
  ('11111111-1111-1111-1111-111111111111', 'Semester 3', 3, true),
  ('11111111-1111-1111-1111-111111111111', 'Semester 4', 4, true),
  ('11111111-1111-1111-1111-111111111111', 'Semester 5', 5, true),
  ('11111111-1111-1111-1111-111111111111', 'Semester 6', 6, true),
  ('11111111-1111-1111-1111-111111111111', 'Semester 7', 7, true),
  ('11111111-1111-1111-1111-111111111111', 'Semester 8', 8, true);

-- 5. Sample Subjects for DCA
INSERT INTO public.subjects (id, department_id, name, code, description, is_active)
VALUES
  ('33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222201', 'Advanced Database Management Systems', 'CAS 2101', 'Relational algebra, query optimization, concurrency control, and distributed storage systems.', true),
  ('33333333-3333-3333-3333-333333333302', '22222222-2222-2222-2222-222222222201', 'Cloud Computing & Distributed Architecture', 'CAS 2102', 'Virtualization, microservices, containerization, and serverless compute.', true),
  ('33333333-3333-3333-3333-333333333303', '22222222-2222-2222-2222-222222222201', 'Software Engineering & Agile Methodologies', 'CAS 2103', 'Scrum ceremonies, sprint planning, CI/CD, and quality assurance.', true)
ON CONFLICT (id) DO NOTHING;

-- 6. Sample Syllabus Modules (CAS 2101 Modules 1 to 5)
INSERT INTO public.subject_modules (subject_id, module_number, title, description)
VALUES
  ('33333333-3333-3333-3333-333333333301', 1, 'Relational Model & Formal Query Languages', 'Relational calculus, domain relational calculus, and SQL engine mechanics.'),
  ('33333333-3333-3333-3333-333333333301', 2, 'Database Normalization & Dependency Theory', 'Functional dependencies, 1NF, 2NF, 3NF, BCNF, 4NF, and lossless joins.'),
  ('33333333-3333-3333-3333-333333333301', 3, 'Query Processing & Optimization', 'Parsing, query execution plans, cost-based estimation, and indexing with B-Trees.'),
  ('33333333-3333-3333-3333-333333333301', 4, 'Transaction Management & Concurrency Control', 'ACID properties, 2PL, timestamp ordering, and deadlock detection algorithms.'),
  ('33333333-3333-3333-3333-333333333301', 5, 'Distributed Databases & NoSQL Models', 'CAP theorem, consistent hashing, replication strategies, and document databases.')
ON CONFLICT (subject_id, module_number) DO NOTHING;
