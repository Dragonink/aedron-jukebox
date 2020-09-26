const { join } = require("path");
const { promises: { writeFile } } = require("fs");
const PACKAGE = require("./package.json");

const APP_DIR = PACKAGE.main.split("/")[0];
const APP_PACKAGE = {
    productName: PACKAGE.productName,
    name: PACKAGE.name,
    version: PACKAGE.version,
    author: PACKAGE.author,
    description: PACKAGE.description,
    license: PACKAGE.license,
    private: true,
    engines: {
        ...PACKAGE.engines,
        electron: PACKAGE.devDependencies.electron
    },
    dependencies: PACKAGE.dependencies ?? {},
    main: PACKAGE.main.split("/").slice(1).join("/"),
    scripts: {
        start: "electron ."
    }
};
writeFile(join(APP_DIR, "package.json"), JSON.stringify(APP_PACKAGE))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
