const gulp = require('gulp');
const del = require('del');
const fs = require('fs');
const path = require('path');
const exec = require('child_process').exec;

// Directories
const repoDirectory = __dirname;
const binDirectory = path.join(repoDirectory, 'bin');
const libDirectory =  path.join(repoDirectory, 'lib');
const scriptsDirectory =  path.join(repoDirectory, 'scripts');
const srcDirectory =  path.join(repoDirectory, 'src');

// Configuration
const configuration = process.env.CONFIGURATION !== null ? process.env.Configuration : 'debug';
const official = process.env.OFFICIAL === 'true' ? true : false;
const npmInstall = process.env.NPM_INSTALL === 'false' ? false : true;

// Build Paths
const outputDirectory = `${binDirectory}/${configuration}`;
const stagingDirectory = `${libDirectory}/${configuration}`;
const libNodeModulesDirectory = `${libDirectory}/node_modules`;
const srcNodeModulesDirectory = `${srcDirectory}/node_modules`;

// Scripts
const powerShellExe = 'C:\\Program Files\\PowerShell\\7\\pwsh.exe';
const getExtensionVersionScriptPath = `${scriptsDirectory}/Get-ExtensionVersion.ps1`;
const rollbackScriptPath = `${scriptsDirectory}/Rollback.ps1`;
const setPublisherInfoScriptPath = `${scriptsDirectory}/Set-PublisherInfo.ps1`;

// Configuration
const extensionManifestFileName = configuration === 'debug' ? 'extension-manifest-debug.json' : 'extension-manifest.json';

function updateBuildTaskVersion(filePath, major, minor, patch, count) {
    console.log(`Upticking build task - ${filePath}`);

    if (count === 0) {
        console.log(`Count is 0. Skipping upticking task version: ${filePath}`);
        return;
    }

    if (!major && !minor && !patch) {
        throw new Error('No version upticks requested.');
    }

    const lines = [];

    const majorRegex = /(?<="Major":\s*)(?<Version>\d+)/;
    const minorRegex = /(?<="Minor":\s*)(?<Version>\d+)/;
    const patchRegex = /(?<="Patch":\s*)(?<Version>\d+)/;

    let findMajor = major;
    let findMinor = major || minor;
    let findPatch = major || !minor || patch;

    const fileContent = fs.readFileSync(filePath, 'utf8');
    const fileLines = fileContent.split('\n');

    fileLines.forEach((line) => {
        let modifiedLine = line;

        if (major && line.match(majorRegex)) {
            const version = parseInt(line.match(majorRegex).groups.Version) + count;
            modifiedLine = line.replace(majorRegex, version);
            findMajor = false;
        } else if (findMinor && line.match(minorRegex)) {
            let version = 0;
            if (minor) {
            version = parseInt(line.match(minorRegex).groups.Version) + count;
            }
            modifiedLine = line.replace(minorRegex, version);
            findMinor = false;
        } else if (findPatch && line.match(patchRegex)) {
            let version = 0;
            if (patch) {
            version = parseInt(line.match(patchRegex).groups.Version) + count;
            }
            modifiedLine = line.replace(patchRegex, version);
            findPatch = false;
        }

        lines.push(modifiedLine);
    });

    fs.writeFileSync(filePath, lines.join('\n'));
}

function updateBuildTaskVersions(rootDirectory, targetDirectory, count) {
    const rootDirectory = rootDirectory || path.dirname(__dirname);
    const targetDirectory = targetDirectory || path.join(rootDirectory, directory);

    switch (directory) {
        case 'lib':
            targetDirectory = path.join(targetDirectory, configuration);
            break;
        default:
            throw new Error(`Unknown folder to uptick build task versions for: ${directory}`);
    }

    if (!fs.existsSync(targetDirectory)) {
        throw new Error(`Unable to find the build tasks folder to uptick: ${targetDirectory}. If upticking the staging directory, ensure you have built the extension to uptick.`);
    }

    const updateBuildTaskVersion = path.join(__dirname, 'Update-BuildTaskVersion.ps1');

    fs.readdirSync(targetDirectory, { withFileTypes: true }).forEach((entry) => {
        const filePath = path.join(targetDirectory, entry.name);
        switch (parameterSetName) {
            case 'Major':
                updateBuildTaskVersion(filePath, true, false, false, count);
                break;
            case 'Minor':
                updateBuildTaskVersion(filePath, false, true, false, count);
                break;
            case 'Patch':
                updateBuildTaskVersion(filePath, true, false, true, count);
                break;
        }
    });
}

function clean(cb) {
    del([stagingDirectory, outputDirectory])
        .then(() => cb());
}

function npmInstallSrc(cb) {
    if (npmInstall) {
        exec('npm install', { cwd: srcDirectory }, cb);
    } else {
        cb();
    }
}

function compileTypescript(cb) {
    exec(`npx tsc --outDir "${stagingDirectory}"`, { cwd: srcDirectory }, cb);
}

function npmInstallLib(cb) {
    if (npmInstall) {
        gulp.src([`${srcDirectory}/.npmrc`, `${srcDirectory}/package.json`])
            .pipe(gulp.dest(libDirectory));
    
        exec('npm install --production', { cwd: stagingDirectory }, cb);
    } else {
        cb();
    }
}
  
function stageExt(cb) {
    return gulp.src([
        path.join(srcDirectory, extensionManifestFileName),
        path.join(srcDirectory, 'icon.png'),
        path.join(srcDirectory, 'extension-readme.md'),
        path.join(srcDirectory, 'extension-eula.md')
    ])
        .pipe(gulp.dest(stagingDirectory));
}

function extPrep(cb) {
    if (configuration === 'debug') {
        exec(`"${powerShellExe}" -NonInteractive -NoProfile -ExecutionPolicy Unrestricted -Command "& { & '${setPublisherInfoScriptPath}' -ManifestPath '${stagingDirectory}/extension-manifest.json' -StagingDirectory '${stagingDirectory}' -PublishersDirectory '${publishersDirectory}' -PublisherName '${publisherName}' }"`, cb);
    } else {
        cb();
    }
}
  
function extGetVersion(cb) {
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            cb(err);
            return;
        }
      
        try {
          const extensionJson = JSON.parse(data);
          const version = extensionJson.version;
          console.log(version);
          cb();
        } catch (error) {
          console.error('Error parsing JSON:', error);
          cb(error);
        }
    });
}

function extBuild(cb) {
    const command = `npx tfx extension create --manifest-globs "$(StagedExtensionManifestFilePath)" --output-path "$(OutputExtensionFilePath).$(EXTENSION_VERSION).vsix"`;
    const options = {
        cwd: "$(StagingDirectory)"
    };

    gulp.src('.')
        .pipe(exec(command, options))
        .pipe(exec.reporter())
        .then(() => cb())
}

function extGetRollbackVersion(cb) {
    const command = `pwsh -NonInteractive -NoProfile -ExecutionPolicy Unrestricted -Command "& { $(GetExtensionVersionScriptPath) -FilePath '$(StagedExtensionManifestFilePath)' }"`;
    gulp.src('.')
        .pipe(exec(command, { console: true }))
        .pipe(exec.reporter({
            stdout: true,
            err: true
        }))
        .pipe(exec.buffer())
        .pipe(gulp.dest('.'))
        .on('end', () => {
            const extensionRollbackVersion = process.env.EXTENSION_ROLLBACK_VERSION;
            console.log(`Extension rollback version: ${extensionRollbackVersion}`);
            cb();
        });
}

function extPrepareRollback(cb) {
    const command = `pwsh -NonInteractive -NoProfile -ExecutionPolicy Unrestricted -Command "& { $(RollbackScriptPath) -ExtensionFilePath '$(StagedExtensionManifestFilePath)' -Configuration '$(Configuration)' }"`;
    gulp.src('.')
        .pipe(exec(command, { console: true }))
        .pipe(exec.reporter({
            stdout: true,
            err: true
        }))
        .then(() => cb());
}

function buildRollback(cb) {
    const command = `npx tfx extension create --manifest-globs "$(StagedExtensionManifestFilePath)" --output-path "$(OutputExtensionFilePath).$(EXTENSION_VERSION)-rollback-$(EXTENSION_ROLLBACK_VERSION).vsix"`;
    const options = {
        cwd: stagingDirectory
    };
    gulp.src('.')
        .pipe(exec(command, options))
        .pipe(exec.reporter())
        .then(() => cb());
}

exports.clean = clean;
exports.compile = gulp.series(clean, npmInstallSrc, compileTypescript);
exports.stage = gulp.series(exports.compile, npmInstallLib, stageExt);
exports.build = gulp.series(validateConfiguration, exports.stage, extBuild);
exports.rollback = gulp.series(extGetVersion, extPrepareRollback, extGetRollbackVersion, buildRollback);
exports.default = null;