/**
 * angular-schema-form-nwp-file-upload - Upload file type for Angular Schema Form
 * @version v0.1.5
 * @link https://github.com/saburab/angular-schema-form-nwp-file-upload
 * @license MIT
 */
'use strict';

angular
   .module('schemaForm')
   .config(['schemaFormProvider', 'schemaFormDecoratorsProvider', 'sfPathProvider',
      function (schemaFormProvider, schemaFormDecoratorsProvider, sfPathProvider) {
         var defaultPatternMsg  = 'Wrong file type. Allowed types are ',
             defaultMaxSizeMsg1 = 'This file is too large. Maximum size allowed is ',
             defaultMaxSizeMsg2 = 'Current file size:',
             defaultMinItemsMsg = 'You have to upload at least one file',
             defaultMaxItemsMsg = 'You can\'t upload more than one file.',
             defaultPriority = 1;

         var nwpSinglefileUpload = function (name, schema, options) {
            if (schema.type === 'array' && schema.format === 'singlefile') {
               if (schema.pattern && schema.pattern.mimeType && !schema.pattern.validationMessage) {
                  schema.pattern.validationMessage = defaultPatternMsg;
               }
               if (schema.maxSize && schema.maxSize.maximum && !schema.maxSize.validationMessage) {
                  schema.maxSize.validationMessage  = defaultMaxSizeMsg1;
                  schema.maxSize.validationMessage2 = defaultMaxSizeMsg2;
               }
               if (schema.minItems && schema.minItems.minimum && !schema.minItems.validationMessage) {
                  schema.minItems.validationMessage = defaultMinItemsMsg;
               }
               if (schema.maxItems && schema.maxItems.maximum && !schema.maxItems.validationMessage) {
                  schema.maxItems.validationMessage = defaultMaxItemsMsg;
               }

               var f                                                  = schemaFormProvider.stdFormObj(name, schema, options);
               f.key                                                  = options.path;
               f.type                                                 = 'nwpFileUpload';
               options.lookup[sfPathProvider.stringify(options.path)] = f;
               return f;
            }
         };

         schemaFormProvider.defaults.array.unshift(nwpSinglefileUpload);

         var nwpMultifileUpload = function (name, schema, options) {
            if (schema.type === 'array' && schema.format === 'multifile') {
               if (schema.pattern && schema.pattern.mimeType && !schema.pattern.validationMessage) {
                  schema.pattern.validationMessage = defaultPatternMsg;
               }
               if (schema.maxSize && schema.maxSize.maximum && !schema.maxSize.validationMessage) {
                  schema.maxSize.validationMessage  = defaultMaxSizeMsg1;
                  schema.maxSize.validationMessage2 = defaultMaxSizeMsg2;
               }
               if (schema.minItems && schema.minItems.minimum && !schema.minItems.validationMessage) {
                  schema.minItems.validationMessage = defaultMinItemsMsg;
               }
               if (schema.maxItems && schema.maxItems.maximum && !schema.maxItems.validationMessage) {
                  schema.maxItems.validationMessage = defaultMaxItemsMsg;
               }

               var f                                                  = schemaFormProvider.stdFormObj(name, schema, options);
               f.key                                                  = options.path;
               f.type                                                 = 'nwpFileUpload';
               options.lookup[sfPathProvider.stringify(options.path)] = f;
               return f;
            }
         };

         schemaFormProvider.defaults.array.unshift(nwpMultifileUpload);

         schemaFormDecoratorsProvider.addMapping(
            'bootstrapDecorator',
            'nwpFileUpload',
            'directives/decorators/bootstrap/nwp-file/schema-form-file.html'
         );
      }
   ]);

angular
   .module('ngSchemaFormFile', [
      'ngFileUpload',
      'ngMessages'
   ])
   .directive('ngSchemaFile', ['Upload', '$timeout', '$q', function (Upload, $timeout, $q) {
      return {
         restrict: 'A',
         scope:    true,
         require:  'ngModel',
         link:     function (scope, element, attrs, ngModel) {
            scope.url = scope.form && scope.form.endpoint;
            scope.isSinglefileUpload = scope.form && scope.form.schema && scope.form.schema.format === 'singlefile';

            scope.selectFile  = function (file) {
               scope.picFile = file;
               if (file && file != null && file.length > 0)
               scope.uploadFile(file);
            };
            scope.selectFiles = function (files) {
               scope.picFiles = files;
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
                          file.uuid = fileResult.file[0].uuid;
                          file.uploadCompleted = true;
                          file.progress = 100;
                      });
                      fileResult = scope.form.post ? scope.form.post(response.data) : response.data;
                      ngModel.$setViewValue(fileResult.file[0]);
                      ngModel.$commitViewValue();
                  }, function (response) {
                      if (response.status > 0) {
                          file.errorMsg = response.status + ': ' + response.data.message;
                      } else if (response.status == -1) {
                          file.errorMsg = "Error: trouble connecting to the server, please verify you have internet access.";
                      }
                  }).then(function () {
                      if (fileResult && fileResult != null && fileResult.file)
                          fileService.setFile(fileResult.file[0]);
                  });

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

          scope.deleteFile = function (index) {
            if (angular.isDefined(scope.picFile)) {
                if (fileResult && fileResult != null && fileResult.file)
                    scope.fileService.deleteFile(scope.picFile.uuid);
                scope.picFile = null;
                ngModel.$setViewValue(scope.picFile);
                ngModel.$commitViewValue();
            } else {
                if (fileResult && fileResult != null && fileResult.file)
                    scope.fileService.deleteFile(scope.picFiles[index].uuid);
                scope.picFiles.splice(index, 1);
                ngModel.$setViewValue(scope.picFiles);
                ngModel.$commitViewValue();
            };
            fileResult = null;
            //scope.errorMsg = null;
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
            scope.submit        = function () {
               if (scope.uploadForm.file && scope.uploadForm.file.$valid && scope.picFile && !scope.picFile.$error) {
                  scope.uploadFile(scope.picFile);
               } else if (scope.uploadForm.files && scope.uploadForm.files.$valid && scope.picFiles && !scope.picFiles.$error) {
                  scope.uploadFiles(scope.picFiles);
               }
            };
            scope.$on('schemaFormValidate', scope.validateField);
            scope.$on('schemaFormFileUploadSubmit', scope.submit);
         }
      };
   }]);
