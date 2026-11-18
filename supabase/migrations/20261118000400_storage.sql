-- Etapa 1: bucket privado para los PDFs de los exámenes.
-- Los PDFs se abren con URLs firmadas (createSignedUrl), que exigen permiso
-- de lectura sobre el objeto. Ruta sugerida: <persona_id>/<examen_id>.pdf

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('habilitaciones-examenes', 'habilitaciones-examenes', false, 5242880, array['application/pdf'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy habilitaciones_pdf_select on storage.objects
  for select to authenticated
  using (bucket_id = 'habilitaciones-examenes' and (select habilitaciones_priv.puede_leer()));

create policy habilitaciones_pdf_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'habilitaciones-examenes' and (select habilitaciones_priv.puede_cargar_examenes()));

-- Regenerar el PDF después de editar un examen (upsert).
create policy habilitaciones_pdf_update_admin on storage.objects
  for update to authenticated
  using (bucket_id = 'habilitaciones-examenes' and (select habilitaciones_priv.es_admin()))
  with check (bucket_id = 'habilitaciones-examenes' and (select habilitaciones_priv.es_admin()));

-- Sin política de delete: los PDFs acompañan a exámenes que no se borran.
