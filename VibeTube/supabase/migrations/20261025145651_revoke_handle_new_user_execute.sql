-- Триггерную функцию не нужно вызывать через /rest/v1/rpc — триггер работает и без EXECUTE у ролей API
revoke execute on function public.handle_new_user() from public, anon, authenticated;
