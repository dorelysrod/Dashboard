-- Portal de propuestas: cada maqueta se abre en /p/[numero] con candado email+código.
-- `numero` = identificador corto público (no secreto); la seguridad es email+código.
alter table public.maquetas add column if not exists email  text;
alter table public.maquetas add column if not exists codigo text;

create sequence if not exists maquetas_numero_seq;
alter table public.maquetas add column if not exists numero bigint;
alter table public.maquetas alter column numero set default nextval('maquetas_numero_seq');
update public.maquetas set numero = nextval('maquetas_numero_seq') where numero is null;
create unique index if not exists maquetas_numero_key on public.maquetas (numero);
