
const registeredCmd = {
    val: false
};

module.exports = (Program, Doggo) => {

    const dbUtils = require('./db')(Program, Doggo);
    let doggoUtils = {};
    const db = dbUtils.db;

    if (!registeredCmd.val) {

        registeredCmd.val = true;

        Program
        .command('genPassword')
        .description('Generate a password')
        .action(() => {

            console.log(Doggo.api.genPassword());
        });
    }

    doggoUtils = {

        assertParams: (params, numRequired, helpMessage) => {

            if (params.length < numRequired) {
                dbUtils.logAndDestroy(`--help ${helpMessage}`);
                return process.exit(1);
            }

            return params;
        },
        assertYouBetterBeThere: (arr, query) => {

            if (arr.length === 0) {
                return dbUtils.onErrorDestroy(`404 Your query "${JSON.stringify(query, undefined, 4)}" was not found.`);
            }
        },
        assertThereCanOnlyBeONE: (arr, query) => {

            if (arr.length > 1) {
                return dbUtils.onErrorDestroy(`"${JSON.stringify(query, undefined, 4)}"\nreturned more than ONE result\n"${JSON.stringify(arr)}"`);
            }
        }
    };

    return doggoUtils;
};
