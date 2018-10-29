
exports.up = function(knex, Promise) {

    return Promise.all([

        knex.schema.createTableIfNotExists('Settings', function (table) {

            table.increments();
            table.timestamps();
            table.integer('keepUnlocked');
        }),

        knex.schema.createTableIfNotExists('Users', function (table) {

            table.increments();
            table.timestamps();
            table.string('email');
            table.string('name');
            table.string('fingerprint');
            table.string('publicKey', 4000);
            table.string('jwt');
        }),

        knex.schema.createTableIfNotExists('Groups', function (table) {

            table.increments();
            table.timestamps();
            table.string('name').unique();
            table.string('fingerprint');
        }),

        knex.schema.createTableIfNotExists('UsersGroups', function (table) {

            table.increments();
            table.timestamps();
            table.string('user');
            table.string('group');
            table.string('encryptedPassword', 4000);
        }),

        knex.schema.createTableIfNotExists('Organizations', function (table) {

            table.increments();
            table.timestamps();
            table.string('name').unique();
            table.string('fingerprint');
        }),

        knex.schema.createTableIfNotExists('UsersOrganizations', function (table) {

            table.increments();
            table.timestamps();
            table.string('user');
            table.string('organization');
            table.string('encryptedPassword', 4000);
        }),

        knex.schema.createTableIfNotExists('Remotes', function (table) {

            table.increments();
            table.timestamps();
            table.string('name').unique();
            table.string('url');
        }),

        knex.schema.createTableIfNotExists('UsersRemotes', function (table) {

            table.increments();
            table.timestamps();
            table.string('userName');
            table.string('remoteName');
        })
    ]);
};

exports.down = function(knex, Promise) {

    //
};
