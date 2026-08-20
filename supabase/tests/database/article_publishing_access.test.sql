begin;

select plan(4);

select ok(
  has_table_privilege('service_role', 'public.articles', 'select'),
  'the administrative role can inspect articles before publishing'
);

select ok(
  has_table_privilege('service_role', 'public.articles', 'insert'),
  'the administrative role can create articles'
);

select ok(
  has_table_privilege('service_role', 'public.articles', 'update'),
  'the administrative role can publish and archive articles'
);

select ok(
  not has_table_privilege('service_role', 'public.articles', 'delete'),
  'the administrative role cannot delete articles'
);

select * from finish();

rollback;
