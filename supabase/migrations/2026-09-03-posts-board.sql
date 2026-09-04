-- Run once in the Supabase SQL editor.
-- Boards share the posts table: 'south-star' (parody blog) and 'trash' (Talk Your Shit forum).
alter table posts add column if not exists board text not null default 'south-star';
create index if not exists posts_board_created_idx on posts (board, created_at desc);
