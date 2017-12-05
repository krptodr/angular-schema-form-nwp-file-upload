/**
 * angular-schema-form-nwp-file-upload - Upload file type for Angular Schema Form
 * @version v0.1.5
 * @link https://github.com/saburab/angular-schema-form-nwp-file-upload
 * @license MIT
 */
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
        
              function _applyDefaultValidationErrorMessages (form, schema, messagesObject) {
                form.validationMessage = form.validationMessage || {};
                for (var keyword in messagesObject) {
                  if (schema[keyword] && !form.validationMessage[keyword]) {
                    form.validationMessage[keyword] = messagesObject[keyword];
                  }
                }
              }


              function registerDefaultTypes () {
                function nwpSinglefileUploadDefaultProvider (name, schema, options) {
                  if (schema.type === 'array' && schema.format === 'singlefile') {
                    var f = schemaFormProvider.stdFormObj(name, schema, options);
                    f.key = options.path;
                    f.type = 'nwpFileUpload';
                    options.lookup[sfPathProvider.stringify(options.path)] = f;
                    _applyDefaultValidationErrorMessages(f, schema, _defaultSingleFileUploadValidationErrorMessages);
                    return f;
                  }
                }
        
                function nwpMultifileUploadDefaultProvider (name, schema, options) {
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
   .directive('ngSchemaFile', ['Upload', '$timeout', '$q', '$interpolate', '$translate', 'submissionService', 'fileService', function (Upload, $timeout, $q, $interpolate, $translate, submissionService, fileService) {//, 'submissionService', 'fileService', submissionService, fileService
      return {
         restrict: 'A',
         scope:    true,
         require:  'ngModel',
         link:     function (scope, element, attrs, ngModel) {
            scope.url = scope.form && scope.form.endpoint;
            scope.isSinglefileUpload = scope.form && scope.form.schema && scope.form.schema.format === 'singlefile';
            
             scope.fileService = fileService;


            scope.selectFile  = function (file, $invalidFile) {
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

            

function _mergeDataToNgModelValue (model) {
              if (ngModel.$modelValue) {
                ngModel.$setViewValue(angular.merge(ngModel.$modelValue, model));
              } else {
                ngModel.$setViewValue(model);
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
                          file.uuid = fileResult.file[0].uuid;
                          file.uploadCompleted = true;
                          file.progress = 100;
                      });
                      fileResult = scope.form.post ? scope.form.post(response.data) : response.data;
                      _mergeDataToNgModelValue(fileResult.file);
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

          function _clearErrorMsg () {
            delete scope.errorMsg;
          }

          function _resetFieldNgModel (isArray) {
              if (isArray){                
                ngModel.$setViewValue([]);
              }else {
                ngModel.$setViewValue();
              }
            ngModel.$commitViewValue();
          }

        
          // This is the ngModel of the "file" input, instead of the ngModel of the whole form
          function _resetFileNgModel () {
            var fileNgModel = scope.uploadForm.file;
            fileNgModel.$setViewValue();
            fileNgModel.$commitViewValue();
            delete scope.picFile;
          }

          // This is the ngModel of the "file" input, instead of the ngModel of the whole form
          function _resetFilesNgModel (index) {
            var fileNgModel = scope.uploadForm.files;
            if (scope.picFiles.length === 1){
                fileNgModel.$setViewValue();
                delete scope.picFiles;
            } else {
                scope.picFiles.splice(index, 1);
            fileNgModel.$setViewValue(scope.picFiles);
            }
            fileNgModel.$commitViewValue();
          }

          scope.removeInvalidFile = function (invalidFile, index){
            if (scope.isSinglefileUpload){
                delete scope.invalidFile;
            } else {
                scope.invalidFiles.splice(index, 1);
            }
          };

          scope.removeFile = function (file, index) {
            if (scope.isSinglefileUpload){
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

            scope.submit        = function () {
               if (scope.uploadForm.file && scope.uploadForm.file.$valid && scope.picFile && !scope.picFile.$error) {
                  scope.uploadFile(scope.picFile);
               } else if (scope.uploadForm.files && scope.uploadForm.files.$valid && scope.picFiles && !scope.picFiles.$error) {
                  scope.uploadFiles(scope.picFiles);
               }
            };

            scope.$on('schemaFormValidate', scope.validateField);
            scope.$on('schemaFormFileUploadSubmit', scope.submit);

            scope.interpValidationMessage = function interpValidationMessage (errorType, invalidFile) {
                if (!invalidFile) {
                  return;
                }
            
                var error = errorType;//invalidFile.$error; // e.g., 'maxSize'
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

angular.module("schemaForm").run(["$templateCache", function($templateCache) {$templateCache.put("directives/decorators/bootstrap/nwp-file/nwp-file.html","<ng-form class=\"file-upload mb-lg\" ng-schema-file ng-model=\"$$value$$\" name=\"uploadForm\">\r\n    <label ng-show=\"form.title && form.notitle !== true\" class=\"control-label\" for=\"fileInputButton\" ng-class=\"{\'sr-only\': !showTitle(), \'text-danger\': uploadForm.$error.required && !uploadForm.$pristine}\">\r\n        {{ form.title }}<i ng-show=\"form.required\">&nbsp;*</i>\r\n    </label>\r\n    <div ng-show=\"picFile\">\r\n        <div ng-include=\"\'uploadProcess.html\'\" class=\"mb\"></div>\r\n    </div>\r\n    <ul ng-show=\"picFiles && picFiles.length\" class=\"list-group\">\r\n        <li class=\"list-group-item\" ng-repeat=\"picFile in picFiles\">\r\n            <div ng-include=\"\'uploadProcess.html\'\"></div>\r\n        </li>\r\n    </ul>\r\n    <div class=\"well well-sm bg-white mb\" ng-class=\"{\'has-error border-danger\': (uploadForm.$error.required && !uploadForm.$pristine) || (hasError() && errorMessage(schemaError()))}\">\r\n        <small class=\"text-muted\" ng-show=\"form.description\" ng-bind-html=\"form.description\"></small>\r\n        <div ng-if=\"isSinglefileUpload\" ng-include=\"\'singleFileUpload.html\'\"></div>\r\n        <div ng-if=\"!isSinglefileUpload\" ng-include=\"\'multiFileUpload.html\'\"></div>\r\n        <div class=\"help-block mb0\" ng-show=\"uploadForm.$error.required && !uploadForm.$pristine\">{{ \'modules.attribute.fields.required.caption\' | translate }}</div>\r\n        <div class=\"help-block mb0\" ng-show=\"(hasError() && errorMessage(schemaError()))\" ng-bind-html=\"(hasError() && errorMessage(schemaError()))\"></div>\r\n    </div>\r\n</ng-form>\r\n<script type=\'text/ng-template\' id=\"uploadProcess.html\">\r\n    <div class=\"row mb\">\r\n        <div class=\"col-sm-4 mb-sm\">\r\n            <label title=\"{{ form.i18n.preview? form.i18n.preview : (\'modules.upload.field.preview\' | translate)}}\" class=\"text-info\">{{ form.i18n.preview? form.i18n.preview : (\'modules.upload.field.preview\' | translate)}}</label>\r\n            <img ngf-src=\"picFile\" class=\"img-thumbnail img-responsive\">\r\n            <div class=\"img-placeholder\" ng-class=\"{\'show\': picFile.$invalid && !picFile.blobUrl, \'hide\': !picFile || picFile.blobUrl}\">No preview available\r\n            </div>\r\n        </div>\r\n        <div class=\"col-sm-4 mb-sm\">\r\n            <label title=\"{{ form.i18n.filename ? form.i18n.filename : (\'modules.upload.field.filename\' | translate)  }}\" class=\"text-info\">{{ form.i18n.filename ? form.i18n.filename : (\'modules.upload.field.filename\' | translate)}}</label>\r\n            <div class=\"filename\" title=\"{{ picFile.name }}\">{{ picFile.name }}</div>\r\n        </div>\r\n        <div class=\"col-sm-4 mb-sm\">\r\n            <label title=\"{{ form.i18n.progress ? form.i18n.progress : (\'modules.upload.field.progress\' | translate)  }}\" class=\"text-info\">{{ form.i18n.progress ? form.i18n.progress : (\'modules.upload.field.progress\' | translate) }}</label>\r\n            <div class=\"progress\">\r\n                <div class=\"progress-bar progress-bar-striped\" role=\"progressbar\" ng-class=\"{\'progress-bar-success\': picFile.progress == 100}\" ng-style=\"{width: picFile.progress + \'%\'}\">\r\n                    {{ picFile.progress }} %\r\n                </div>\r\n            </div>\r\n            <button class=\"btn btn-primary btn-sm\" type=\"button\" ng-click=\"uploadFile(picFile)\" ng-disabled=\"!picFile || picFile.$error\">{{ form.i18n.upload ? form.i18n.upload : (\'buttons.upload\' | translate) }}\r\n            </button>\r\n        </div>\r\n    </div>\r\n    <div ng-messages=\"uploadForm.$error\" ng-messages-multiple=\"\">\r\n        <div class=\"text-danger errorMsg\" ng-message=\"maxSize\">{{ form[picFile.$error].validationMessage | translate }} <strong>{{picFile.$errorParam}}</strong>. ({{ form[picFile.$error].validationMessage2 | translate }} <strong>{{picFile.size / 1000000|number:1}}MB</strong>)</div>\r\n        <div class=\"text-danger errorMsg\" ng-message=\"pattern\">{{ form[picFile.$error].validationMessage | translate }} <strong>{{picFile.$errorParam}}</strong></div>\r\n        <div class=\"text-danger errorMsg\" ng-message=\"maxItems\">{{ form[picFile.$error].validationMessage | translate }} <strong>{{picFile.$errorParam}}</strong></div>\r\n        <div class=\"text-danger errorMsg\" ng-message=\"minItems\">{{ form[picFile.$error].validationMessage | translate }} <strong>{{picFile.$errorParam}}</strong></div>\r\n        <div class=\"text-danger errorMsg\" ng-show=\"errorMsg\">{{errorMsg}}</div>\r\n    </div>\r\n</script>\r\n<script type=\'text/ng-template\' id=\"singleFileUpload.html\">\r\n    <div ngf-drop=\"selectFile(picFile)\" ngf-select=\"selectFile(picFile)\" type=\"file\" ngf-multiple=\"false\" ng-model=\"picFile\" name=\"file\" ng-attr-ngf-pattern=\"{{form.schema.pattern && form.schema.pattern.mimeType ? form.schema.pattern.mimeType : undefined }}\" ng-attr-ngf-max-size=\"{{form.schema.maxSize && form.schema.maxSize.maximum ? form.schema.maxSize.maximum : undefined }}\" ng-required=\"form.required\" accept=\"{{form.schema.pattern && form.schema.pattern.mimeType}}\" ng-model-options=\"form.ngModelOptions\" ngf-drag-over-class=\"dragover\" class=\"drop-box dragAndDropDescription\">\r\n        <p class=\"text-center\">{{form.i18n.dragorclick ? form.i18n.dragorclick:(\'modules.upload.descriptionSinglefile\' | translate)}}</p>\r\n    </div>\r\n    <div ngf-no-file-drop>{{ \'modules.upload.dndNotSupported\' | translate}}</div>\r\n    <button ngf-select=\"selectFile(picFile)\" type=\"file\" ngf-multiple=\"false\" ng-model=\"picFile\" name=\"file\" ng-attr-ngf-pattern=\"{{form.schema.pattern && form.schema.pattern.mimeType ? form.schema.pattern.mimeType : undefined }}\" ng-attr-ngf-max-size=\"{{form.schema.maxSize && form.schema.maxSize.maximum ? form.schema.maxSize.maximum : undefined }}\" ng-required=\"form.required\" accept=\"{{form.schema.pattern && form.schema.pattern.mimeType}}\" ng-model-options=\"form.ngModelOptions\" id=\"fileInputButton\" class=\"btn btn-primary btn-block {{form.htmlClass}} mt-lg mb\">\r\n        <fa fw=\"fw\" name=\"upload\" class=\"mr-sm\"></fa>\r\n        {{form.i18n.add ? form.i18n.add : (\'buttons.add\' | translate)}}\r\n    </button>\r\n</script>\r\n<script type=\'text/ng-template\' id=\"multiFileUpload.html\">\r\n    <div ngf-drop=\"selectFiles(picFiles)\" ngf-select=\"selectFiles(picFiles)\" type=\"file\" ngf-multiple=\"true\" ng-model=\"picFiles\" name=\"files\" ng-attr-ngf-pattern=\"{{form.schema.pattern && form.schema.pattern.mimeType ? form.schema.pattern.mimeType : undefined }}\" ng-attr-ngf-max-size=\"{{form.schema.maxSize && form.schema.maxSize.maximum ? form.schema.maxSize.maximum : undefined }}\" ng-required=\"form.required\" accept=\"{{form.schema.pattern && form.schema.pattern.mimeType}}\" ng-model-options=\"form.ngModelOptions\" ngf-drag-over-class=\"dragover\" class=\"drop-box dragAndDropDescription\">\r\n        <p class=\"text-center\">{{form.i18n.dragorclick ? form.i18n.dragorclick:(\'modules.upload.descriptionMultifile\' | translate)}}</p>\r\n    </div>\r\n    <div ngf-no-file-drop>{{ \'modules.upload.dndNotSupported\' | translate}}</div>\r\n    <button ngf-select=\"selectFiles(picFiles)\" type=\"file\" ngf-multiple=\"true\" multiple ng-model=\"picFiles\" name=\"files\" accept=\"{{form.schema.pattern && form.schema.pattern.mimeType}}\" ng-attr-ngf-pattern=\"{{form.schema.pattern && form.schema.pattern.mimeType ? form.schema.pattern.mimeType : undefined }}\" ng-attr-ngf-max-size=\"{{form.schema.maxSize && form.schema.maxSize.maximum ? form.schema.maxSize.maximum : undefined }}\" ng-required=\"form.required\" ng-model-options=\"form.ngModelOptions\" id=\"fileInputButton\" class=\"btn btn-primary btn-block {{form.htmlClass}} mt-lg mb\">\r\n        <fa fw=\"fw\" name=\"upload\" class=\"mr-sm\"></fa>\r\n        {{form.i18n.add ? form.i18n.add : (\'buttons.add\' | translate)}}\r\n    </button>\r\n</script>");
$templateCache.put("directives/decorators/bootstrap/nwp-file/schema-form-file.html","<ng-form class=\"file-upload mb-lg\" ng-schema-file schema-validate=\"form\" sf-field-model=\"replaceAll\" ng-model=\"$$value$$\"\r\n  name=\"uploadForm\">\r\n  <!--sf-field-model=\"replaceAll\"schema-validate=\"form\" sf-field-model=\"replaceAll\"-->\r\n  <label ng-show=\"form.title && form.notitle !== true\" class=\"control-label\" for=\"fileInputButton\" ng-class=\"{\'sr-only\': !showTitle(), \'text-danger\': uploadForm.$error.required && !uploadForm.$pristine}\">\r\n    {{::form.title}}\r\n    <i ng-show=\"form.required\">&nbsp;*</i>\r\n  </label>\r\n\r\n  <div ng-show=\"picFile && !picFile.$error\" class=\"well well-sm bg-white mb\" ng-class=\"{\'has-error border-danger\': (uploadForm.$error.required && !uploadForm.$pristine) || (hasError() && errorMessage(schemaError()))}\">\r\n    <ul class=\"list-group\">\r\n      <li class=\"list-group-item\">\r\n        <div ng-include=\"\'directives/decorators/bootstrap/nwp-file/schema-form-file.template.progress.html\'\" ></div>\r\n        <span ng-show=\"picFile.errorMsg\" class=\"help-block has-error mb0\">{{ picFile.errorMsg }}</span>\r\n      </li>\r\n    </ul>    \r\n    <!-- <div ng-include=\"\'directives/decorators/bootstrap/nwp-file/schema-form-file.template.errors.html\'\" class=\"mb\"></div> -->\r\n    <span class=\"help-block\" sf-message=\"form.description\"></span>\r\n  </div>\r\n\r\n  <div ng-show=\"invalidFile\" class=\"well well-sm mb\">\r\n    <label title=\"Invalid Files\" style=\"color:#a94442\" class=\"text-info\">Invalid File</label>\r\n\r\n    <div ng-class=\"{\'has-error border-danger\': (uploadForm.$error.required && !uploadForm.$pristine) || (hasError() && errorMessage(schemaError()))}\">\r\n\r\n      <ul class=\"list-group\" ng-show=\"invalidFile\">\r\n        <li class=\"list-group-item\" style=\"border-color:#a94442;display:block;height: auto;padding:0px;\">\r\n          <!--ng-repeat=\"invalidFile in invalidFiles\"-->\r\n\r\n          <div class=\"row\">\r\n            <span class=\"col-xs-5 col-sm-5 col-md-5\" title=\"{{invalidFile.name}}\"> {{invalidFile.name}} </span>\r\n            <div class=\"col-xs-6 col-sm-6 text-danger errorMsg col-md-6\" ng-include=\"\'directives/decorators/bootstrap/nwp-file/schema-form-file.template.errors.html\'\"></div>\r\n            <div class=\"col-xs-1 col-sm-1 col-md-1\">\r\n                <button class=\"btn btn-xs btn-danger\" type=\"button\" ng-click=\"removeInvalidFile(invalidFile)\">\r\n                    <span class=\"glyphicon glyphicon-remove\"></span>\r\n                </button></div>\r\n          </div>\r\n        </li>\r\n      </ul>\r\n    </div>\r\n  </div>\r\n\r\n\r\n\r\n  <ul ng-show=\"picFiles && picFiles.length\" class=\"list-group\">\r\n    <li class=\"list-group-item\" ng-repeat=\"picFile in picFiles\">\r\n      <div ng-include=\"\'directives/decorators/bootstrap/nwp-file/schema-form-file.template.progress.html\'\"></div>\r\n      <!-- <div ng-include=\"\'directives/decorators/bootstrap/nwp-file/schema-form-file.template.errors.html\'\" class=\"mb\"></div> -->\r\n    </li>\r\n  </ul>\r\n\r\n  <div ng-show=\"(invalidFiles && invalidFiles.length)\" class=\"well well-sm mb\">\r\n      <label title=\"Invalid Files\" style=\"color:#a94442\" class=\"text-info\">Invalid Files</label>\r\n  \r\n      <div ng-show=\"(invalidFiles && invalidFiles.length)\" ng-class=\"{\'has-error border-danger\': (uploadForm.$error.required && !uploadForm.$pristine) || (hasError() && errorMessage(schemaError()))}\">\r\n  \r\n        <ul class=\"list-group\" ng-show=\"(invalidFiles && invalidFiles.length)\">\r\n          <li class=\"list-group-item\" style=\"border-color:#a94442;display:block;height: auto;padding:0px;\" ng-repeat=\"invalidFile in invalidFiles\">\r\n            <!---->\r\n  \r\n            <div class=\"row\">\r\n              <span class=\"col-xs-5 col-sm-5 col-md-5\" title=\"{{invalidFile.name}}\"> {{invalidFile.name}} </span>\r\n              <div class=\"col-xs-6 col-sm-6 text-danger errorMsg col-md-6\" ng-include=\"\'directives/decorators/bootstrap/nwp-file/schema-form-file.template.errors.html\'\"></div>\r\n              <div class=\"col-xs-1 col-sm-1 col-md-1\">\r\n                  <button class=\"btn btn-xs btn-danger\" type=\"button\" ng-click=\"removeInvalidFile(invalidFile, $index)\">\r\n                      <span class=\"glyphicon glyphicon-remove\"></span>\r\n                  </button></div>\r\n            </div>\r\n          </li>\r\n        </ul>\r\n      </div>\r\n    </div>\r\n\r\n  <div ng-show=\"(isSinglefileUpload && !picFile) || (!isSinglefileUpload && (!picFiles || !picFiles.length))\" class=\"well well-sm bg-white mb\"\r\n    ng-class=\"{\'has-error border-danger\': (uploadForm.$error.required && !uploadForm.$pristine) || (hasError() && errorMessage(schemaError()))}\">\r\n    <small class=\"text-muted\" ng-show=\"form.description\" ng-bind-html=\"form.description\"></small>\r\n    <div ng-if=\"isSinglefileUpload\" ng-include=\"\'directives/decorators/bootstrap/nwp-file/schema-form-file.template.single.html\'\"></div>\r\n    <div ng-if=\"!isSinglefileUpload\" ng-include=\"\'directives/decorators/bootstrap/nwp-file/schema-form-file.template.multiple.html\'\"></div>\r\n    <div class=\"help-block mb0\" ng-show=\"uploadForm.$error.required && !uploadForm.$pristine\">{{ \'modules.attribute.fields.required.caption\' | translate }}</div>\r\n    <span ng-show=\"errorMsg\" class=\"help-block text-danger mb0\">Error: {{ errorMsg }}</span>\r\n    <span class=\"help-block\" sf-message=\"form.description\"></span>\r\n  </div>\r\n</ng-form>");
$templateCache.put("directives/decorators/bootstrap/nwp-file/schema-form-file.template.errors.html","<div ng-messages=\"uploadForm.$error\" ng-messages-multiple=\"\">\r\n  <div class=\"text-danger errorMsg\" ng-message=\"pattern\">{{ interpValidationMessage(\'pattern\', invalidFile)  }}</div>\r\n  <div class=\"text-danger errorMsg\" ng-message=\"maxSize\">{{ interpValidationMessage(\'maxSize\', invalidFile) }}</div>\r\n  <div class=\"text-danger errorMsg\" ng-message=\"maxItems\">{{ interpValidationMessage(\'maxItems\', invalidFile) }}</div>\r\n  <div class=\"text-danger errorMsg\" ng-message=\"minItems\">{{ interpValidationMessage(\'minItems\', invalidFile)}}</div>\r\n  <div class=\"text-danger errorMsg\" ng-show=\"errorMsg\">Error: {{ errorMsg }}</div>\r\n</div>");
$templateCache.put("directives/decorators/bootstrap/nwp-file/schema-form-file.template.multiple.html","<div ngf-drop=\"selectFiles(picFiles, $invalidFiles)\" ngf-select=\"selectFiles(picFiles, $invalidFiles)\" type=\"file\" ngf-multiple=\"true\"\r\n    ng-model=\"picFiles\" name=\"files\"\r\n    ng-attr-ngf-pattern=\"{{form.schema.pattern && form.schema.pattern.mimeType ? form.schema.pattern.mimeType : undefined }}\"\r\n    ng-attr-ngf-max-size=\"{{form.schema.maxSize && form.schema.maxSize.maximum ? form.schema.maxSize.maximum : undefined }}\"\r\n    ng-required=\"form.required\"\r\n    accept=\"{{::form.schema.pattern.mimeType}}\"\r\n    ng-model-options=\"form.ngModelOptions\" ngf-drag-over-class=\"dragover\" class=\"drop-box dragAndDropDescription\">\r\n  <p class=\"text-center\">{{ \'modules.upload.descriptionMultifile\' | translate }}</p>\r\n</div>\r\n<div ngf-no-file-drop>{{ \'modules.upload.dndNotSupported\' | translate}}</div>");
$templateCache.put("directives/decorators/bootstrap/nwp-file/schema-form-file.template.progress.html","<div class=\"row mb\">\r\n    <!---->\r\n    <div class=\"col-xs-1 mb-sm\">\r\n        <!---->\r\n        <label title=\"Result\" class=\"text-info\">&nbsp;</label>\r\n        <div class=\"img-placeholder\">\r\n            <span class=\"fa fa-2x\" aria-hidden=\"true\" ng-class=\"{\'fa-check-circle-o text-success show\': picFile.result && picFile.progress == 100,\r\n                        \'fa-exclamation-circle show text-danger\': picFile.errorMsg,\r\n                        \'fa-refresh fa-spin fa-fw text-primary show\': (picFile.progress >= 0 && picFile.progress < 100) && !picFile.errorMsg}\"\r\n                uib-tooltip=\"{{ (picFile.progress >= 0 && picFile.progress < 100) ? \'Uploading...\' : \'\' || picFile.result || (picFile.errorMsg) ? \'See message below for more details.\' : \'\'}}\"\r\n                tooltip-placement=\"top\" tooltip-trigger=\"\'mouseenter\'\">\r\n                <!--, \'hide\': !picFile.progress || picFile.progress != 100-->\r\n            </span>\r\n\r\n        </div>\r\n    </div>\r\n    <div class=\"col-xs-9 col-sm-6 mb-sm\">\r\n        <!--col-sm-8 -->\r\n        <label title=\"{{ form.i18n.filename ? form.i18n.filename : (\'modules.upload.field.filename\' | translate)  }}\" class=\"text-info\">{{ form.i18n.filename ? form.i18n.filename : (\'modules.upload.field.filename\' | translate)}}</label>\r\n        <div class=\"filename\" title=\"{{ picFile.name }}\">{{ picFile.name }}</div>\r\n    </div>\r\n\r\n    \r\n    <div class=\"col-sm-2 hidden-xs\">\r\n            <label title=\"Result\" class=\"text-info\">Size</label>\r\n            <small ng-switch=\"fileService.file.size > 1024*1024\">\r\n                <small ng-switch-when=\"true\">({{picFile.size / 1024 / 1024 | number:2}} Mb)</small>\r\n                <small ng-switch-default>({{picFile.size / 1024 | number:2}} kB)</small>\r\n            </small>\r\n        </div>\r\n\r\n    <div class=\"col-xs-5 col-sm-2 hidden-xs mb-sm\">\r\n        <!--col-sm-2 -->\r\n        <label title=\"{{ form.i18n.progress ? form.i18n.progress : (\'modules.upload.field.progress\' | translate)  }}\" class=\"text-info\">{{ form.i18n.progress ? form.i18n.progress : (\'modules.upload.field.progress\' | translate) }}</label>\r\n        <div class=\"progress\">\r\n            <div class=\"progress-bar progress-bar-striped\" role=\"progressbar\" ng-class=\"{\'progress-bar-success\': picFile.progress == 100}\"\r\n                ng-style=\"{width: picFile.progress + \'%\'}\">\r\n                {{ picFile.progress ? picFile.progress : 0 }} %\r\n            </div>\r\n        </div>\r\n    </div>\r\n    <div class=\"col-xs-1 col-sm-1 mb-sm\">\r\n        <label title=\"Result\" class=\"text-info\">&nbsp;</label>\r\n        <!--col-sm-1 -->\r\n        <button class=\"btn btn-xs btn-danger\" type=\"button\" ng-click=\"removeFile(picFile, $index)\">\r\n            <span class=\"glyphicon glyphicon-remove\"></span>\r\n        </button>\r\n    </div>\r\n</div>");
$templateCache.put("directives/decorators/bootstrap/nwp-file/schema-form-file.template.single.html","<div ngf-drop=\"selectFile(picFile, $invalidFile)\" ngf-select=\"selectFile(picFile, $invalidFile)\" type=\"file\" ngf-multiple=\"false\" ngf-invalid-model=\"$invalidFile\"\r\n    ng-model=\"picFile\" name=\"file\"\r\n    ngf-run-all-validations=\"true\"\r\n    ng-attr-ngf-pattern=\"{{form.schema.pattern && form.schema.pattern.mimeType ? form.schema.pattern.mimeType : undefined }}\"\r\n    ng-attr-ngf-max-size=\"{{form.schema.maxSize && form.schema.maxSize.maximum ? form.schema.maxSize.maximum : undefined }}\"\r\n    ng-required=\"form.required\"\r\n    accept=\"{{::form.schema.pattern.mimeType}}\"\r\n    ng-model-options=\"form.ngModelOptions\" ngf-drag-over-class=\"dragover\" class=\"drop-box dragAndDropDescription\">\r\n  <p class=\"text-center\">{{ \'modules.upload.descriptionSinglefile\' | translate }}</p>\r\n</div>\r\n<div ngf-no-file-drop>{{ \'modules.upload.dndNotSupported\' | translate}}</div>\r\n");}]);
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNjaGVtYS1mb3JtLWZpbGUuanMiLCJ0ZW1wbGF0ZXMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs4RUN2U0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6InNjaGVtYS1mb3JtLWZpbGUuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogYW5ndWxhci1zY2hlbWEtZm9ybS1ud3AtZmlsZS11cGxvYWQgLSBVcGxvYWQgZmlsZSB0eXBlIGZvciBBbmd1bGFyIFNjaGVtYSBGb3JtXHJcbiAqIEB2ZXJzaW9uIHYwLjEuNVxyXG4gKiBAbGluayBodHRwczovL2dpdGh1Yi5jb20vc2FidXJhYi9hbmd1bGFyLXNjaGVtYS1mb3JtLW53cC1maWxlLXVwbG9hZFxyXG4gKiBAbGljZW5zZSBNSVRcclxuICovXHJcbid1c2Ugc3RyaWN0JztcclxuXHJcbmFuZ3VsYXJcclxuICAgLm1vZHVsZSgnc2NoZW1hRm9ybScpXHJcbiAgIC5jb25maWcoWydzY2hlbWFGb3JtUHJvdmlkZXInLCAnc2NoZW1hRm9ybURlY29yYXRvcnNQcm92aWRlcicsICdzZlBhdGhQcm92aWRlcicsICdzZkJ1aWxkZXJQcm92aWRlcicsXHJcbiAgICAgIGZ1bmN0aW9uIChzY2hlbWFGb3JtUHJvdmlkZXIsIHNjaGVtYUZvcm1EZWNvcmF0b3JzUHJvdmlkZXIsIHNmUGF0aFByb3ZpZGVyLCBzZkJ1aWxkZXJQcm92aWRlcikgeyAgICAgICAgXHJcbiAgICAgICAgdmFyIGRlZmF1bHRQcmlvcml0eSA9IDE7XHJcblxyXG5cclxuICAgICAgICAgICAgIHZhciBfZGVmYXVsdFNpbmdsZUZpbGVVcGxvYWRWYWxpZGF0aW9uRXJyb3JNZXNzYWdlcyA9IHtcclxuICAgICAgICAgICAgICAgICdtYXhTaXplJzogJ1RoaXMgZmlsZSBpcyB0b28gbGFyZ2UgKHt7ZmlsZS5zaXplIC8gMTAwMDAwMCB8IG51bWJlcjoyfX1NQikuIE1heGltdW0gc2l6ZSBhbGxvd2VkIGlzIHt7c2NoZW1hLm1heFNpemUubWF4aW11bX19JyxcclxuICAgICAgICAgICAgICAgICdwYXR0ZXJuJzogJ1dyb25nIGZpbGUgdHlwZS4gQWxsb3dlZCB0eXBlcyBhcmUge3tzY2hlbWEucGF0dGVybi5taW1lVHlwZX19J1xyXG4gICAgICAgICAgICAgIH07XHJcbiAgICAgICAgXHJcbiAgICAgICAgICAgICAgdmFyIF9kZWZhdWx0TXVsdGlGaWxlVXBsb2FkVmFsaWRhdGlvbkVycm9yTWVzc2FnZXMgPSB7XHJcbiAgICAgICAgICAgICAgICAnbWF4U2l6ZSc6IF9kZWZhdWx0U2luZ2xlRmlsZVVwbG9hZFZhbGlkYXRpb25FcnJvck1lc3NhZ2VzLm1heFNpemUsXHJcbiAgICAgICAgICAgICAgICAncGF0dGVybic6IF9kZWZhdWx0U2luZ2xlRmlsZVVwbG9hZFZhbGlkYXRpb25FcnJvck1lc3NhZ2VzLnBhdHRlcm4sXHJcbiAgICAgICAgICAgICAgICAnbWluSXRlbXMnOiAnWW91IGhhdmUgdG8gdXBsb2FkIGF0IGxlYXN0IHt7c2NoZW1hLm1pbkl0ZW1zfX0gZmlsZShzKScsXHJcbiAgICAgICAgICAgICAgICAnbWF4SXRlbXMnOiAnWW91IGNhblxcJ3QgdXBsb2FkIG1vcmUgdGhhbiB7e3NjaGVtYS5tYXhJdGVtc319IGZpbGUocykuJ1xyXG4gICAgICAgICAgICAgIH07XHJcbiAgICAgICAgXHJcbiAgICAgICAgICAgICAgZnVuY3Rpb24gX2FwcGx5RGVmYXVsdFZhbGlkYXRpb25FcnJvck1lc3NhZ2VzIChmb3JtLCBzY2hlbWEsIG1lc3NhZ2VzT2JqZWN0KSB7XHJcbiAgICAgICAgICAgICAgICBmb3JtLnZhbGlkYXRpb25NZXNzYWdlID0gZm9ybS52YWxpZGF0aW9uTWVzc2FnZSB8fCB7fTtcclxuICAgICAgICAgICAgICAgIGZvciAodmFyIGtleXdvcmQgaW4gbWVzc2FnZXNPYmplY3QpIHtcclxuICAgICAgICAgICAgICAgICAgaWYgKHNjaGVtYVtrZXl3b3JkXSAmJiAhZm9ybS52YWxpZGF0aW9uTWVzc2FnZVtrZXl3b3JkXSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGZvcm0udmFsaWRhdGlvbk1lc3NhZ2Vba2V5d29yZF0gPSBtZXNzYWdlc09iamVjdFtrZXl3b3JkXTtcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgICAgICAgIGZ1bmN0aW9uIHJlZ2lzdGVyRGVmYXVsdFR5cGVzICgpIHtcclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIG53cFNpbmdsZWZpbGVVcGxvYWREZWZhdWx0UHJvdmlkZXIgKG5hbWUsIHNjaGVtYSwgb3B0aW9ucykge1xyXG4gICAgICAgICAgICAgICAgICBpZiAoc2NoZW1hLnR5cGUgPT09ICdhcnJheScgJiYgc2NoZW1hLmZvcm1hdCA9PT0gJ3NpbmdsZWZpbGUnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGYgPSBzY2hlbWFGb3JtUHJvdmlkZXIuc3RkRm9ybU9iaihuYW1lLCBzY2hlbWEsIG9wdGlvbnMpO1xyXG4gICAgICAgICAgICAgICAgICAgIGYua2V5ID0gb3B0aW9ucy5wYXRoO1xyXG4gICAgICAgICAgICAgICAgICAgIGYudHlwZSA9ICdud3BGaWxlVXBsb2FkJztcclxuICAgICAgICAgICAgICAgICAgICBvcHRpb25zLmxvb2t1cFtzZlBhdGhQcm92aWRlci5zdHJpbmdpZnkob3B0aW9ucy5wYXRoKV0gPSBmO1xyXG4gICAgICAgICAgICAgICAgICAgIF9hcHBseURlZmF1bHRWYWxpZGF0aW9uRXJyb3JNZXNzYWdlcyhmLCBzY2hlbWEsIF9kZWZhdWx0U2luZ2xlRmlsZVVwbG9hZFZhbGlkYXRpb25FcnJvck1lc3NhZ2VzKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZjtcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gbndwTXVsdGlmaWxlVXBsb2FkRGVmYXVsdFByb3ZpZGVyIChuYW1lLCBzY2hlbWEsIG9wdGlvbnMpIHtcclxuICAgICAgICAgICAgICAgICAgaWYgKHNjaGVtYS50eXBlID09PSAnYXJyYXknICYmIHNjaGVtYS5mb3JtYXQgPT09ICdtdWx0aWZpbGUnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGYgPSBzY2hlbWFGb3JtUHJvdmlkZXIuc3RkRm9ybU9iaihuYW1lLCBzY2hlbWEsIG9wdGlvbnMpO1xyXG4gICAgICAgICAgICAgICAgICAgIGYua2V5ID0gb3B0aW9ucy5wYXRoO1xyXG4gICAgICAgICAgICAgICAgICAgIGYudHlwZSA9ICdud3BGaWxlVXBsb2FkJztcclxuICAgICAgICAgICAgICAgICAgICBvcHRpb25zLmxvb2t1cFtzZlBhdGhQcm92aWRlci5zdHJpbmdpZnkob3B0aW9ucy5wYXRoKV0gPSBmO1xyXG4gICAgICAgICAgICAgICAgICAgIF9hcHBseURlZmF1bHRWYWxpZGF0aW9uRXJyb3JNZXNzYWdlcyhmLCBzY2hlbWEsIF9kZWZhdWx0TXVsdGlGaWxlVXBsb2FkVmFsaWRhdGlvbkVycm9yTWVzc2FnZXMpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmO1xyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgICAgICAgICBzY2hlbWFGb3JtUHJvdmlkZXIuZGVmYXVsdHMuYXJyYXkudW5zaGlmdChud3BTaW5nbGVmaWxlVXBsb2FkRGVmYXVsdFByb3ZpZGVyKTtcclxuICAgICAgICAgICAgICAgIHNjaGVtYUZvcm1Qcm92aWRlci5kZWZhdWx0cy5hcnJheS51bnNoaWZ0KG53cE11bHRpZmlsZVVwbG9hZERlZmF1bHRQcm92aWRlcik7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgICAgICAgIHJlZ2lzdGVyRGVmYXVsdFR5cGVzKCk7XHJcblxyXG4gICAgICAgICAgICAgIHNjaGVtYUZvcm1EZWNvcmF0b3JzUHJvdmlkZXIuZGVmaW5lQWRkT24oXHJcbiAgICAgICAgICAgICAgICAnYm9vdHN0cmFwRGVjb3JhdG9yJyxcclxuICAgICAgICAgICAgICAgICdud3BGaWxlVXBsb2FkJyxcclxuICAgICAgICAgICAgICAgICdkaXJlY3RpdmVzL2RlY29yYXRvcnMvYm9vdHN0cmFwL253cC1maWxlL3NjaGVtYS1mb3JtLWZpbGUuaHRtbCcsXHJcbiAgICAgICAgICAgICAgICAvLyBkZWZhdWx0c1xyXG4gICAgICAgICAgICAgICAgc2ZCdWlsZGVyUHJvdmlkZXIuc3RkQnVpbGRlcnNcclxuICAgICAgICAgICAgKTtcclxuICAgICAgfVxyXG4gICBdKTtcclxuXHJcbmFuZ3VsYXJcclxuICAgLm1vZHVsZSgnbmdTY2hlbWFGb3JtRmlsZScsIFtcclxuICAgICAgJ25nRmlsZVVwbG9hZCcsXHJcbiAgICAgICduZ01lc3NhZ2VzJ1xyXG4gICBdKVxyXG4gICAuZGlyZWN0aXZlKCduZ1NjaGVtYUZpbGUnLCBbJ1VwbG9hZCcsICckdGltZW91dCcsICckcScsICckaW50ZXJwb2xhdGUnLCAnJHRyYW5zbGF0ZScsICdzdWJtaXNzaW9uU2VydmljZScsICdmaWxlU2VydmljZScsIGZ1bmN0aW9uIChVcGxvYWQsICR0aW1lb3V0LCAkcSwgJGludGVycG9sYXRlLCAkdHJhbnNsYXRlLCBzdWJtaXNzaW9uU2VydmljZSwgZmlsZVNlcnZpY2UpIHsvLywgJ3N1Ym1pc3Npb25TZXJ2aWNlJywgJ2ZpbGVTZXJ2aWNlJywgc3VibWlzc2lvblNlcnZpY2UsIGZpbGVTZXJ2aWNlXHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgIHJlc3RyaWN0OiAnQScsXHJcbiAgICAgICAgIHNjb3BlOiAgICB0cnVlLFxyXG4gICAgICAgICByZXF1aXJlOiAgJ25nTW9kZWwnLFxyXG4gICAgICAgICBsaW5rOiAgICAgZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50LCBhdHRycywgbmdNb2RlbCkge1xyXG4gICAgICAgICAgICBzY29wZS51cmwgPSBzY29wZS5mb3JtICYmIHNjb3BlLmZvcm0uZW5kcG9pbnQ7XHJcbiAgICAgICAgICAgIHNjb3BlLmlzU2luZ2xlZmlsZVVwbG9hZCA9IHNjb3BlLmZvcm0gJiYgc2NvcGUuZm9ybS5zY2hlbWEgJiYgc2NvcGUuZm9ybS5zY2hlbWEuZm9ybWF0ID09PSAnc2luZ2xlZmlsZSc7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgc2NvcGUuZmlsZVNlcnZpY2UgPSBmaWxlU2VydmljZTtcclxuXHJcblxyXG4gICAgICAgICAgICBzY29wZS5zZWxlY3RGaWxlICA9IGZ1bmN0aW9uIChmaWxlLCAkaW52YWxpZEZpbGUpIHtcclxuICAgICAgICAgICAgICAgIHNjb3BlLmludmFsaWRGaWxlID0gJGludmFsaWRGaWxlO1xyXG4gICAgICAgICAgICAgICAgc2NvcGUucGljRmlsZSA9IGZpbGU7XHJcbiAgICAgICAgICAgICAgICBpZiAoZmlsZSAmJiBmaWxlICE9IG51bGwpXHJcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUudXBsb2FkRmlsZShmaWxlKTtcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgc2NvcGUuc2VsZWN0RmlsZXMgPSBmdW5jdGlvbiAoZmlsZXMsICRpbnZhbGlkRmlsZXMpIHtcclxuICAgICAgICAgICAgICAgIHNjb3BlLmludmFsaWRGaWxlcyA9ICRpbnZhbGlkRmlsZXM7XHJcbiAgICAgICAgICAgICAgICBzY29wZS5waWNGaWxlcyA9IGZpbGVzO1xyXG4gICAgICAgICAgICAgICAgaWYgKGZpbGVzICYmIGZpbGVzICE9IG51bGwgJiYgZmlsZXMubGVuZ3RoID4gMClcclxuICAgICAgICAgICAgICAgICAgICBzY29wZS51cGxvYWRGaWxlcyhmaWxlcyk7XHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBzY29wZS51cGxvYWRGaWxlID0gZnVuY3Rpb24gKGZpbGUpIHtcclxuICAgICAgICAgICAgICAgZmlsZSAmJiBkb1VwbG9hZChmaWxlKTtcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIHNjb3BlLnVwbG9hZEZpbGVzID0gZnVuY3Rpb24gKGZpbGVzKSB7XHJcbiAgICAgICAgICAgICAgIGZpbGVzLmxlbmd0aCAmJiBhbmd1bGFyLmZvckVhY2goZmlsZXMsIGZ1bmN0aW9uIChmaWxlKSB7XHJcbiAgICAgICAgICAgICAgICAgIGRvVXBsb2FkKGZpbGUpO1xyXG4gICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIFxyXG5cclxuZnVuY3Rpb24gX21lcmdlRGF0YVRvTmdNb2RlbFZhbHVlIChtb2RlbCkge1xyXG4gICAgICAgICAgICAgIGlmIChuZ01vZGVsLiRtb2RlbFZhbHVlKSB7XHJcbiAgICAgICAgICAgICAgICBuZ01vZGVsLiRzZXRWaWV3VmFsdWUoYW5ndWxhci5tZXJnZShuZ01vZGVsLiRtb2RlbFZhbHVlLCBtb2RlbCkpO1xyXG4gICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBuZ01vZGVsLiRzZXRWaWV3VmFsdWUobW9kZWwpO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICBuZ01vZGVsLiRjb21taXRWaWV3VmFsdWUoKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdmFyIGZpbGVSZXN1bHQgPSBudWxsO1xyXG5cclxuICAgICAgICAgICAgZnVuY3Rpb24gZG9VcGxvYWQoZmlsZSkge1xyXG4gICAgICAgICAgICAgICBpZiAoZmlsZSAmJiAhZmlsZS4kZXJyb3IgJiYgc2NvcGUudXJsKSB7XHJcbiAgICAgICAgICAgICAgICAgIHZhciBvcHRpb25zID0ge1xyXG4gICAgICAgICAgICAgICAgICAgICB1cmw6IHNjb3BlLnVybCxcclxuICAgICAgICAgICAgICAgICAgICAgZGF0YTogeyBcclxuICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGU6IHt9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgZXZlbnRJZDoge30sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICB1c2VySWQ6IHt9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgcHJpb3JpdHk6IHNjb3BlLmZvcm0uc2NoZW1hLnByaW9yaXR5XHJcbiAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICAgIG9wdGlvbnMuZGF0YVtzY29wZS5mb3JtLmZpbGVOYW1lIHx8ICdmaWxlJ10gPSBmaWxlO1xyXG4gICAgICAgICAgICAgICAgICBvcHRpb25zLmRhdGFbJ2V2ZW50SWQnXSA9IHN1Ym1pc3Npb25TZXJ2aWNlLmdldFJlcG9ydFR5cGUoKS5yZXBvcnRUeXBlLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICBvcHRpb25zLmRhdGFbJ3VzZXJJZCddID0gc3VibWlzc2lvblNlcnZpY2UuZ2V0VXNlcklkKCk7XHJcbiAgICAgICAgICAgICAgICAgIGZpbGUudXBsb2FkID0gVXBsb2FkLnVwbG9hZChvcHRpb25zKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgIGZpbGUudXBsb2FkLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAkdGltZW91dChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsZS5yZXN1bHQgPSByZXNwb25zZS5kYXRhLm1lc3NhZ2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsZS51dWlkID0gZmlsZVJlc3VsdC5maWxlWzBdLnV1aWQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsZS51cGxvYWRDb21wbGV0ZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGUucHJvZ3Jlc3MgPSAxMDA7XHJcbiAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgIGZpbGVSZXN1bHQgPSBzY29wZS5mb3JtLnBvc3QgPyBzY29wZS5mb3JtLnBvc3QocmVzcG9uc2UuZGF0YSkgOiByZXNwb25zZS5kYXRhO1xyXG4gICAgICAgICAgICAgICAgICAgICAgX21lcmdlRGF0YVRvTmdNb2RlbFZhbHVlKGZpbGVSZXN1bHQuZmlsZSk7XHJcbiAgICAgICAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChyZXNwb25zZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICBmaWxlLmVycm9yTXNnID0gcmVzcG9uc2Uuc3RhdHVzICsgJzogJyArIHJlc3BvbnNlLmRhdGEubWVzc2FnZTtcclxuICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAocmVzcG9uc2Uuc3RhdHVzID09IC0xKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsZS5lcnJvck1zZyA9IFwiRXJyb3I6IHRyb3VibGUgY29ubmVjdGluZyB0byB0aGUgc2VydmVyLCBwbGVhc2UgdmVyaWZ5IHlvdSBoYXZlIGludGVybmV0IGFjY2Vzcy5cIjtcclxuICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgfSkudGhlbihmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICBpZiAoZmlsZVJlc3VsdCAmJiBmaWxlUmVzdWx0ICE9IG51bGwgJiYgZmlsZVJlc3VsdC5maWxlKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGVTZXJ2aWNlLnNldEZpbGUoZmlsZVJlc3VsdC5maWxlWzBdKTtcclxuICAgICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICBmaWxlLnVwbG9hZC5wcm9ncmVzcyhmdW5jdGlvbiAoZXZ0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICBmaWxlLnByb2dyZXNzID0gTWF0aC5taW4oMTAwLCBwYXJzZUludCgxMDAuMCAqXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgZXZ0LmxvYWRlZCAvIGV2dC50b3RhbCkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgaWYgKGZpbGUucHJvZ3Jlc3MgPT0gMTAwICYmICFmaWxlLnVwbG9hZENvbXBsZXRlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIC8vYmVjYXVzZSB3ZSBuZWVkIHRoZSByZXNwb25zZSB0byByZXR1cm4sIHdlIGFyZW4ndCB0cnVlbHkgYXQgMTAwJSBjb21wbGV0ZSwgdW50aWwgdGhlIHJlcG9uc2UgaXMgcmV0dXJuZWQuIG5nLWZpbGUtdXBsb2FkIHNheXMgd2UncmUgYXQgMTAwJSB3aGVuIHRoZSBmaWxlIGlzIHNlbnQgdG8gdGhlIHNlcnZlci5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICBmaWxlLnByb2dyZXNzID0gOTk7XHJcbiAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICBmdW5jdGlvbiBfY2xlYXJFcnJvck1zZyAoKSB7XHJcbiAgICAgICAgICAgIGRlbGV0ZSBzY29wZS5lcnJvck1zZztcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICBmdW5jdGlvbiBfcmVzZXRGaWVsZE5nTW9kZWwgKGlzQXJyYXkpIHtcclxuICAgICAgICAgICAgICBpZiAoaXNBcnJheSl7ICAgICAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgbmdNb2RlbC4kc2V0Vmlld1ZhbHVlKFtdKTtcclxuICAgICAgICAgICAgICB9ZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBuZ01vZGVsLiRzZXRWaWV3VmFsdWUoKTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIG5nTW9kZWwuJGNvbW1pdFZpZXdWYWx1ZSgpO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICBcclxuICAgICAgICAgIC8vIFRoaXMgaXMgdGhlIG5nTW9kZWwgb2YgdGhlIFwiZmlsZVwiIGlucHV0LCBpbnN0ZWFkIG9mIHRoZSBuZ01vZGVsIG9mIHRoZSB3aG9sZSBmb3JtXHJcbiAgICAgICAgICBmdW5jdGlvbiBfcmVzZXRGaWxlTmdNb2RlbCAoKSB7XHJcbiAgICAgICAgICAgIHZhciBmaWxlTmdNb2RlbCA9IHNjb3BlLnVwbG9hZEZvcm0uZmlsZTtcclxuICAgICAgICAgICAgZmlsZU5nTW9kZWwuJHNldFZpZXdWYWx1ZSgpO1xyXG4gICAgICAgICAgICBmaWxlTmdNb2RlbC4kY29tbWl0Vmlld1ZhbHVlKCk7XHJcbiAgICAgICAgICAgIGRlbGV0ZSBzY29wZS5waWNGaWxlO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIC8vIFRoaXMgaXMgdGhlIG5nTW9kZWwgb2YgdGhlIFwiZmlsZVwiIGlucHV0LCBpbnN0ZWFkIG9mIHRoZSBuZ01vZGVsIG9mIHRoZSB3aG9sZSBmb3JtXHJcbiAgICAgICAgICBmdW5jdGlvbiBfcmVzZXRGaWxlc05nTW9kZWwgKGluZGV4KSB7XHJcbiAgICAgICAgICAgIHZhciBmaWxlTmdNb2RlbCA9IHNjb3BlLnVwbG9hZEZvcm0uZmlsZXM7XHJcbiAgICAgICAgICAgIGlmIChzY29wZS5waWNGaWxlcy5sZW5ndGggPT09IDEpe1xyXG4gICAgICAgICAgICAgICAgZmlsZU5nTW9kZWwuJHNldFZpZXdWYWx1ZSgpO1xyXG4gICAgICAgICAgICAgICAgZGVsZXRlIHNjb3BlLnBpY0ZpbGVzO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgc2NvcGUucGljRmlsZXMuc3BsaWNlKGluZGV4LCAxKTtcclxuICAgICAgICAgICAgZmlsZU5nTW9kZWwuJHNldFZpZXdWYWx1ZShzY29wZS5waWNGaWxlcyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZmlsZU5nTW9kZWwuJGNvbW1pdFZpZXdWYWx1ZSgpO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIHNjb3BlLnJlbW92ZUludmFsaWRGaWxlID0gZnVuY3Rpb24gKGludmFsaWRGaWxlLCBpbmRleCl7XHJcbiAgICAgICAgICAgIGlmIChzY29wZS5pc1NpbmdsZWZpbGVVcGxvYWQpe1xyXG4gICAgICAgICAgICAgICAgZGVsZXRlIHNjb3BlLmludmFsaWRGaWxlO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgc2NvcGUuaW52YWxpZEZpbGVzLnNwbGljZShpbmRleCwgMSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgc2NvcGUucmVtb3ZlRmlsZSA9IGZ1bmN0aW9uIChmaWxlLCBpbmRleCkge1xyXG4gICAgICAgICAgICBpZiAoc2NvcGUuaXNTaW5nbGVmaWxlVXBsb2FkKXtcclxuICAgICAgICAgICAgICAgIGlmIChmaWxlICYmIGZpbGUudXVpZClcclxuICAgICAgICAgICAgICAgICAgICBzY29wZS5maWxlU2VydmljZS5kZWxldGVGaWxlKGZpbGUudXVpZCk7XHJcblxyXG4gICAgICAgICAgICAgICAgX2NsZWFyRXJyb3JNc2coKTtcclxuICAgICAgICAgICAgICAgIF9yZXNldEZpZWxkTmdNb2RlbCh0cnVlKTtcclxuICAgICAgICAgICAgICAgIF9yZXNldEZpbGVOZ01vZGVsKCk7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGlmIChmaWxlICYmIGZpbGUudXVpZClcclxuICAgICAgICAgICAgICAgICAgICBzY29wZS5maWxlU2VydmljZS5kZWxldGVGaWxlKGZpbGUudXVpZCk7XHJcblxyXG4gICAgICAgICAgICAgICAgX2NsZWFyRXJyb3JNc2coKTtcclxuICAgICAgICAgICAgICAgIF9yZXNldEZpZWxkTmdNb2RlbCh0cnVlKTtcclxuICAgICAgICAgICAgICAgIF9yZXNldEZpbGVzTmdNb2RlbChpbmRleCk7XHJcbiAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBzY29wZS52YWxpZGF0ZUZpZWxkID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICBpZiAoc2NvcGUudXBsb2FkRm9ybS5maWxlICYmIHNjb3BlLnVwbG9hZEZvcm0uZmlsZS4kdmFsaWQgJiYgc2NvcGUucGljRmlsZSAmJiAhc2NvcGUucGljRmlsZS4kZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3NpbmdsZWZpbGUtZm9ybSBpcyBpbnZhbGlkJyk7XHJcbiAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoc2NvcGUudXBsb2FkRm9ybS5maWxlcyAmJiBzY29wZS51cGxvYWRGb3JtLmZpbGVzLiR2YWxpZCAmJiBzY29wZS5waWNGaWxlcyAmJiAhc2NvcGUucGljRmlsZXMuJGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdtdWx0aWZpbGUtZm9ybSBpcyAgaW52YWxpZCcpO1xyXG4gICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnc2luZ2xlLSBhbmQgbXVsdGlmaWxlLWZvcm0gYXJlIHZhbGlkJyk7XHJcbiAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIHNjb3BlLnN1Ym1pdCAgICAgICAgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgIGlmIChzY29wZS51cGxvYWRGb3JtLmZpbGUgJiYgc2NvcGUudXBsb2FkRm9ybS5maWxlLiR2YWxpZCAmJiBzY29wZS5waWNGaWxlICYmICFzY29wZS5waWNGaWxlLiRlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICBzY29wZS51cGxvYWRGaWxlKHNjb3BlLnBpY0ZpbGUpO1xyXG4gICAgICAgICAgICAgICB9IGVsc2UgaWYgKHNjb3BlLnVwbG9hZEZvcm0uZmlsZXMgJiYgc2NvcGUudXBsb2FkRm9ybS5maWxlcy4kdmFsaWQgJiYgc2NvcGUucGljRmlsZXMgJiYgIXNjb3BlLnBpY0ZpbGVzLiRlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICBzY29wZS51cGxvYWRGaWxlcyhzY29wZS5waWNGaWxlcyk7XHJcbiAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIHNjb3BlLiRvbignc2NoZW1hRm9ybVZhbGlkYXRlJywgc2NvcGUudmFsaWRhdGVGaWVsZCk7XHJcbiAgICAgICAgICAgIHNjb3BlLiRvbignc2NoZW1hRm9ybUZpbGVVcGxvYWRTdWJtaXQnLCBzY29wZS5zdWJtaXQpO1xyXG5cclxuICAgICAgICAgICAgc2NvcGUuaW50ZXJwVmFsaWRhdGlvbk1lc3NhZ2UgPSBmdW5jdGlvbiBpbnRlcnBWYWxpZGF0aW9uTWVzc2FnZSAoZXJyb3JUeXBlLCBpbnZhbGlkRmlsZSkge1xyXG4gICAgICAgICAgICAgICAgaWYgKCFpbnZhbGlkRmlsZSkge1xyXG4gICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgdmFyIGVycm9yID0gZXJyb3JUeXBlOy8vaW52YWxpZEZpbGUuJGVycm9yOyAvLyBlLmcuLCAnbWF4U2l6ZSdcclxuICAgICAgICAgICAgICAgIHZhciBmb3JtID0gc2NvcGUuZm9ybTtcclxuICAgICAgICAgICAgICAgIHZhciB2YWxpZGF0aW9uTWVzc2FnZSA9IGZvcm0gJiYgZm9ybS5zY2hlbWEgPyBmb3JtLnZhbGlkYXRpb25NZXNzYWdlIDogZm9ybS5zY2hlbWEudmFsaWRhdGlvbk1lc3NhZ2UgPyBmb3JtLnNjaGVtYS52YWxpZGF0aW9uTWVzc2FnZSA6IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgICAgIHZhciBtZXNzYWdlO1xyXG4gICAgICAgICAgICAgICAgaWYgKGFuZ3VsYXIuaXNTdHJpbmcodmFsaWRhdGlvbk1lc3NhZ2UpKSB7XHJcbiAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSB2YWxpZGF0aW9uTWVzc2FnZTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoYW5ndWxhci5pc09iamVjdCh2YWxpZGF0aW9uTWVzc2FnZSkpIHtcclxuICAgICAgICAgICAgICAgICAgbWVzc2FnZSA9IHZhbGlkYXRpb25NZXNzYWdlW2Vycm9yXTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICBpZiAoIW1lc3NhZ2UpIHtcclxuICAgICAgICAgICAgICAgICAgcmV0dXJuIGVycm9yO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIHZhciBjb250ZXh0ID0ge1xyXG4gICAgICAgICAgICAgICAgICBlcnJvcjogZXJyb3IsXHJcbiAgICAgICAgICAgICAgICAgIGZpbGU6IGludmFsaWRGaWxlLFxyXG4gICAgICAgICAgICAgICAgICBmb3JtOiBmb3JtLFxyXG4gICAgICAgICAgICAgICAgICBzY2hlbWE6IGZvcm0uc2NoZW1hLFxyXG4gICAgICAgICAgICAgICAgICB0aXRsZTogZm9ybS50aXRsZSB8fCAoZm9ybS5zY2hlbWEgJiYgZm9ybS5zY2hlbWEudGl0bGUpXHJcbiAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgdmFyIGludGVycG9sYXRlZE1lc3NhZ2UgPSAkaW50ZXJwb2xhdGUobWVzc2FnZSkoY29udGV4dCk7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgcmV0dXJuICR0cmFuc2xhdGUuaW5zdGFudChpbnRlcnBvbGF0ZWRNZXNzYWdlKTtcclxuICAgICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgfVxyXG4gICAgICB9O1xyXG4gICB9XSk7XHJcbiIsbnVsbF19
