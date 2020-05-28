create table if not exists `user` (
    id int not null auto_increment primary key,
    email varchar(320) not null UNIQUE,
    username varchar(255) not null UNIQUE,
    firstname varchar(128) not null,
    lastname varchar(128) not null,
    photourl varchar(128) not null,
    passhash varchar(128) not null
);

create table if not exists user_stats (
    id int not null,
    date_time datetime not null,
    client_ip varchar(255),
    constraint fk_user foreign key (id) references `user`(id)
);

create table if not exists friends (
    userid int not null,
    friendid int not null,
    constraint fk_user_friends foreign key (userid) references `user`(id),
    constraint fk_user_friends2 foreign key (friendid) references `user`(id),
    start_time datetime,
    accepted boolean not null
)