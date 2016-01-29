/*jshint node: true */

'use strict';

var gulp = require('gulp'),
    concat = require('gulp-concat'),
    less = require('gulp-less'),
    jshint = require('gulp-jshint'),
    // path = require('path'),
    rename = require('gulp-rename'),
    uglify = require('gulp-uglify'),
    minifyCss = require('gulp-minify-css'),
    sourcemaps = require('gulp-sourcemaps'),
    info = require('gulp-print');

gulp.task('jshint', function() {
  return gulp.src([
      './gulpfile.js',
      './src/**/*.js'
    ])
    .pipe(jshint())
    .pipe(jshint.reporter('default'));
});

gulp.task('scripts', ['jshint'], function() {
  return gulp.src([
      './src/ml-esri-maps.js',
      './src/**/*.js',
      './build/**/*.js'
    ])
    .pipe(info(function(filepath) {
      return 'processing: ' + filepath;
    }))
    .pipe(concat('ml-esri-maps-ng.js'))
    .pipe(gulp.dest('dist'))
    .pipe(info(function(filepath) {
      return 'writing: ' + filepath;
    }))

    .pipe(rename('ml-esri-maps-ng.min.js'))
    .pipe(uglify())
    .pipe(gulp.dest('dist'))
    .pipe(info(function(filepath) {
      return 'writing: ' + filepath;
    }))
  ;
});

gulp.task('styles', ['scripts'], function() {
  return gulp.src([
      './less/**/*.less'
    ])
    .pipe(info(function(filepath) {
      return 'processing: ' + filepath;
    }))
    .pipe(sourcemaps.init())
    .pipe(less())
    .pipe(concat('ml-esri-maps-ng.css'))
    .pipe(gulp.dest('dist'))
    .pipe(info(function(filepath) {
      return 'writing: ' + filepath;
    }))

    .pipe(rename('ml-esri-maps-ng.min.css'))
    .pipe(minifyCss())
    .pipe(sourcemaps.write())
    .pipe(gulp.dest('dist'))
    .pipe(info(function(filepath) {
      return 'writing: ' + filepath;
    }))
  ;
});

gulp.task('default', ['styles']);
