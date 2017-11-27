var gulp = require('gulp');
var addStream = require('add-stream');
var angularTemplatecache = require('gulp-angular-templatecache');
var concat = require('gulp-concat');
var del = require('del');
var header = require('gulp-header');
var sourcemaps = require('gulp-sourcemaps');
var uglify = require('gulp-uglify');

var bower = require(settings.appRoot + 'bower.json'); // TODO better way to refer to this file?
var banner = ['/**',
  ' * <%= bower.name %> - <%= bower.description %>',
  ' * @version v<%= bower.version %>',
  ' * @link <%= bower.homepage %>',
  ' * @license <%= bower.license %>',
  ' */',
  ''].join('\n');

function prepareTemplates () {
  return gulp.src('./src/*.html')
        // .pipe(minify and preprocess the template html here)
        .pipe(angularTemplatecache({
          module: 'schemaForm',
          root: 'directives/decorators/bootstrap/nwp-file/'
        }));
}

gulp.task('build-app-dev', function () {
  return gulp.src('./src/schema-form-file.js')
        // .pipe(concat your app js files somehow)
        // append the template js onto one file
        .pipe(addStream.obj(prepareTemplates()))
        .pipe(concat('schema-form-file.js'))
        .pipe(header(banner, { bower: bower }))
        .pipe(gulp.dest('./dist'));
});

gulp.task('build-app-prod', function () {
  return gulp.src('./src/schema-form-file.js')
        // .pipe(concat your app js files somehow)
        // .pipe(sourcemaps.init())
        // append the template js onto one file
        .pipe(addStream.obj(prepareTemplates()))
        .pipe(concat('schema-form-file.min.js'))
        .pipe(uglify())
        // .pipe(sourcemaps.write('.'))
        .pipe(header(banner, { bower: bower }))
        .pipe(gulp.dest('./dist'));
});

gulp.task('default', ['build-app-dev', 'build-app-prod']);

gulp.task('clean', function () {
  return del(['./dist'], {dot: true});
});

gulp.task('watch', function () {
  gulp.watch('./src/**/*', ['default']);
});
