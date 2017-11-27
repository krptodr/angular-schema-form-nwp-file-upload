var gulp = require('gulp');
var KarmaServer = require('karma').Server;
var inject = require('gulp-inject');
var bowerFiles = require('main-bower-files');
var runSequence = require('run-sequence');
var plumber = require('gulp-plumber');
var naturalSort = require('gulp-natural-sort');
var angularFilesort = require('gulp-angular-filesort');
var debug = require('gulp-debug');

gulp.task('inject-test:vendor', function () {
  var injectOptions = {
    name: 'bower',
    relative: true,
    starttag: '// inject-bower',
    endtag: '// end-inject-bower',
    transform: filepathForKarma
  };

  var stream = gulp.src(settings.karmaConfigFile)
    .pipe(plumber({errorHandler: handleErrors}))
    .pipe(inject(
      gulp.src(
        bowerFiles('**/*.js', {checkExistence: true}), {read: false}
      ).pipe(debug()),
      injectOptions
    )).pipe(gulp.dest(settings.appRoot));

  return stream;
});

gulp.task('inject-test:asf-file-upload', function () {
  var injectOpts = {
    relative: true,
    starttag: '// inject-app',
    endtag: '// end-inject-app',
    transform: filepathForKarma
  };

  return gulp.src(settings.karmaConfigFile)
    .pipe(plumber({errorHandler: handleErrors}))
    .pipe(inject(
      gulp.src([settings.src + '**/*.js'])
        .pipe(naturalSort())
        .pipe(angularFilesort())
        .pipe(debug()),
      injectOpts))
    .pipe(gulp.dest(settings.appRoot));
});

gulp.task('inject-test', function () {
  runSequence('inject-test:vendor', 'inject-test:asf-file-upload');
});

gulp.task('test', function (done) {
  new KarmaServer({
    configFile: settings.karmaConfigFile,
    singleRun: true
  }, done).start();
});
