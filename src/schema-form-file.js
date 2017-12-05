/**
 * angular-schema-form-nwp-file-upload - Upload file type for Angular Schema Form
 * @version v0.1.5
 * @link https://github.com/saburab/angular-schema-form-nwp-file-upload
 * @license MIT
 */
'use strict';

angular
  .module('schemaForm')
  .config(['schemaFormProvider', 'schemaFormDecoratorsProvider', 'sfPathProvider', 'sfBuilderProvider',
    function (schemaFormProvider, schemaFormDecoratorsProvider, sfPathProvider, sfBuilderProvider) {
      var defaultPriority = 1;


      var _defaultSingleFileUploadValidationErrorMessages = {
        'maxSize': 'This file is too large ({{file.size / 1000000 | number:2}}MB). Maximum size allowed is {{schema.maxSize.maximum}}',
        'pattern': 'Wrong file type. Allowed types are {{schema.pattern.mimeType}}'
      };

      var _defaultMultiFileUploadValidationErrorMessages = {
        'maxSize': _defaultSingleFileUploadValidationErrorMessages.maxSize,
        'pattern': _defaultSingleFileUploadValidationErrorMessages.pattern,
        'minItems': 'You have to upload at least {{schema.minItems}} file(s)',
        'maxItems': 'You can\'t upload more than {{schema.maxItems}} file(s).'
      };

      function _applyDefaultValidationErrorMessages(form, schema, messagesObject) {
        form.validationMessage = form.validationMessage || {};
        for (var keyword in messagesObject) {
          if (schema[keyword] && !form.validationMessage[keyword]) {
            form.validationMessage[keyword] = messagesObject[keyword];
          }
        }
      }


      function registerDefaultTypes() {
        function nwpSinglefileUploadDefaultProvider(name, schema, options) {
          if (schema.type === 'array' && schema.format === 'singlefile') {
            var f = schemaFormProvider.stdFormObj(name, schema, options);
            f.key = options.path;
            f.type = 'nwpFileUpload';
            options.lookup[sfPathProvider.stringify(options.path)] = f;
            _applyDefaultValidationErrorMessages(f, schema, _defaultSingleFileUploadValidationErrorMessages);
            return f;
          }
        }

        function nwpMultifileUploadDefaultProvider(name, schema, options) {
          if (schema.type === 'array' && schema.format === 'multifile') {
            var f = schemaFormProvider.stdFormObj(name, schema, options);
            f.key = options.path;
            f.type = 'nwpFileUpload';
            options.lookup[sfPathProvider.stringify(options.path)] = f;
            _applyDefaultValidationErrorMessages(f, schema, _defaultMultiFileUploadValidationErrorMessages);
            return f;
          }
        }

        schemaFormProvider.defaults.array.unshift(nwpSinglefileUploadDefaultProvider);
        schemaFormProvider.defaults.array.unshift(nwpMultifileUploadDefaultProvider);
      }

      registerDefaultTypes();

      schemaFormDecoratorsProvider.defineAddOn(
        'bootstrapDecorator',
        'nwpFileUpload',
        'directives/decorators/bootstrap/nwp-file/schema-form-file.html',
        // defaults
        sfBuilderProvider.stdBuilders
      );
    }
  ]);

angular
  .module('ngSchemaFormFile', [
    'ngFileUpload',
    'ngMessages'
  ])
  .directive('ngSchemaFile', ['Upload', '$timeout', '$q', '$interpolate', '$translate', 'submissionService', 'fileService', function (Upload, $timeout, $q, $interpolate, $translate, submissionService, fileService) { //, 'submissionService', 'fileService', submissionService, fileService
    return {
      restrict: 'A',
      scope: true,
      require: 'ngModel',
      link: function (scope, element, attrs, ngModel) {
        scope.url = scope.form && scope.form.endpoint;
        scope.isSinglefileUpload = scope.form && scope.form.schema && scope.form.schema.format === 'singlefile';

        scope.fileService = fileService;


        scope.selectFile = function (file, $invalidFile) {
          scope.invalidFile = $invalidFile;
          scope.picFile = file;
          if (file && file != null)
            scope.uploadFile(file);
        };
        scope.selectFiles = function (files, $invalidFiles) {
          scope.invalidFiles = $invalidFiles;
          scope.picFiles = files;
          if (files && files != null && files.length > 0)
            scope.uploadFiles(files);
        };

        scope.uploadFile = function (file) {
          file && doUpload(file);
        };

        scope.uploadFiles = function (files) {
          files.length && angular.forEach(files, function (file) {
            doUpload(file);
          });
        };




        function _mergeDataToNgModelValue(model) {
          if (scope.isSinglefileUpload) {
            if (ngModel.$modelValue) {
              ngModel.$setViewValue(angular.merge(ngModel.$modelValue, model));
            } else {
              ngModel.$setViewValue(model);
            }
          } else {
            if (ngModel.$modelValue) {
              ngModel.$setViewValue(ngModel.$modelValue.concat(model));
            } else {
              ngModel.$setViewValue([model]);
            }
          }
          ngModel.$commitViewValue();
        }

        var fileResult = null;

        function doUpload(file) {
          if (file && !file.$error && scope.url) {
            var options = {
              url: scope.url,
              data: {
                file: {},
                eventId: {},
                userId: {},
                priority: scope.form.schema.priority
              }
            };

            options.data[scope.form.fileName || 'file'] = file;
            options.data['eventId'] = submissionService.getReportType().reportType.value;
            options.data['userId'] = submissionService.getUserId();
            file.upload = Upload.upload(options);

            file.upload.then(function (response) {
              $timeout(function () {
                file.result = response.data.message;
                file.uuid = response.data.file[0].uuid;
                file.uploadCompleted = true;
                file.progress = 100;
              });
              //fileResult = response.data.file;
              _mergeDataToNgModelValue(response.data.file[0]);
            }, function (response) {
              if (response.status > 0) {
                file.errorMsg = response.status + ': ' + response.data.message;
              } else if (response.status == -1) {
                file.errorMsg = "Error: trouble connecting to the server, please verify you have internet access.";
              }
            });
            // .then(function () {
            //   if (fileResult && fileResult != null && fileResult.file)
            //     fileService.setFile(fileResult.file[0]);
            // });

            file.upload.progress(function (evt) {
              file.progress = Math.min(100, parseInt(100.0 *
                evt.loaded / evt.total));
              if (file.progress == 100 && !file.uploadCompleted) {
                //because we need the response to return, we aren't truely at 100% complete, until the reponse is returned. ng-file-upload says we're at 100% when the file is sent to the server.
                file.progress = 99;
              }
            });
          }
        }

        function _clearErrorMsg() {
          delete scope.errorMsg;
        }

        function _resetFieldNgModel(isArray) {
          if (isArray) {
            ngModel.$setViewValue([]);
          } else {
            ngModel.$setViewValue();
          }
          ngModel.$commitViewValue();
        }


        // This is the ngModel of the "file" input, instead of the ngModel of the whole form
        function _resetFileNgModel() {
          var fileNgModel = scope.uploadForm.file;
          fileNgModel.$setViewValue();
          fileNgModel.$commitViewValue();
          delete scope.picFile;
        }

        // This is the ngModel of the "file" input, instead of the ngModel of the whole form
        function _resetFilesNgModel(index) {
          var fileNgModel = scope.uploadForm.files;
          if (scope.picFiles.length === 1) {
            fileNgModel.$setViewValue();
            delete scope.picFiles;
          } else {
            scope.picFiles.splice(index, 1);
            fileNgModel.$setViewValue(scope.picFiles);
          }
          fileNgModel.$commitViewValue();
        }

        scope.removeInvalidFile = function (invalidFile, index) {
          if (scope.isSinglefileUpload) {
            delete scope.invalidFile;
          } else {
            scope.invalidFiles.splice(index, 1);
          }
        };

        scope.removeFile = function (file, index) {
          if (scope.isSinglefileUpload) {
            if (file && file.uuid)
              scope.fileService.deleteFile(file.uuid);

            _clearErrorMsg();
            _resetFieldNgModel(true);
            _resetFileNgModel();

          } else {
            if (file && file.uuid)
              scope.fileService.deleteFile(file.uuid);

            _clearErrorMsg();
            _resetFieldNgModel(true);
            _resetFilesNgModel(index);

          }
        };

        scope.validateField = function () {
          if (scope.uploadForm.file && scope.uploadForm.file.$valid && scope.picFile && !scope.picFile.$error) {
            console.log('singlefile-form is invalid');
          } else if (scope.uploadForm.files && scope.uploadForm.files.$valid && scope.picFiles && !scope.picFiles.$error) {
            console.log('multifile-form is  invalid');
          } else {
            console.log('single- and multifile-form are valid');
          }
        };

        scope.submit = function () {
          if (scope.uploadForm.file && scope.uploadForm.file.$valid && scope.picFile && !scope.picFile.$error) {
            scope.uploadFile(scope.picFile);
          } else if (scope.uploadForm.files && scope.uploadForm.files.$valid && scope.picFiles && !scope.picFiles.$error) {
            scope.uploadFiles(scope.picFiles);
          }
        };

        scope.$on('schemaFormValidate', scope.validateField);
        scope.$on('schemaFormFileUploadSubmit', scope.submit);

        scope.interpValidationMessage = function interpValidationMessage(errorType, invalidFile) {
          if (!invalidFile) {
            return;
          }

          var error = errorType; //invalidFile.$error; // e.g., 'maxSize'
          var form = scope.form;
          var validationMessage = form && form.schema ? form.validationMessage : form.schema.validationMessage ? form.schema.validationMessage : undefined;
          var message;
          if (angular.isString(validationMessage)) {
            message = validationMessage;
          } else if (angular.isObject(validationMessage)) {
            message = validationMessage[error];
          }

          if (!message) {
            return error;
          }

          var context = {
            error: error,
            file: invalidFile,
            form: form,
            schema: form.schema,
            title: form.title || (form.schema && form.schema.title)
          };
          var interpolatedMessage = $interpolate(message)(context);

          return $translate.instant(interpolatedMessage);
        };

      }
    };
  }]);