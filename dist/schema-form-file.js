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
                      ngModel.$setViewValue(fileResult.file);
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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNjaGVtYS1mb3JtLWZpbGUuanMiLCJ0ZW1wbGF0ZXMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs4RUM5UkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6InNjaGVtYS1mb3JtLWZpbGUuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogYW5ndWxhci1zY2hlbWEtZm9ybS1ud3AtZmlsZS11cGxvYWQgLSBVcGxvYWQgZmlsZSB0eXBlIGZvciBBbmd1bGFyIFNjaGVtYSBGb3JtXHJcbiAqIEB2ZXJzaW9uIHYwLjEuNVxyXG4gKiBAbGluayBodHRwczovL2dpdGh1Yi5jb20vc2FidXJhYi9hbmd1bGFyLXNjaGVtYS1mb3JtLW53cC1maWxlLXVwbG9hZFxyXG4gKiBAbGljZW5zZSBNSVRcclxuICovXHJcbid1c2Ugc3RyaWN0JztcclxuXHJcbmFuZ3VsYXJcclxuICAgLm1vZHVsZSgnc2NoZW1hRm9ybScpXHJcbiAgIC5jb25maWcoWydzY2hlbWFGb3JtUHJvdmlkZXInLCAnc2NoZW1hRm9ybURlY29yYXRvcnNQcm92aWRlcicsICdzZlBhdGhQcm92aWRlcicsICdzZkJ1aWxkZXJQcm92aWRlcicsXHJcbiAgICAgIGZ1bmN0aW9uIChzY2hlbWFGb3JtUHJvdmlkZXIsIHNjaGVtYUZvcm1EZWNvcmF0b3JzUHJvdmlkZXIsIHNmUGF0aFByb3ZpZGVyLCBzZkJ1aWxkZXJQcm92aWRlcikgeyAgICAgICAgXHJcbiAgICAgICAgdmFyIGRlZmF1bHRQcmlvcml0eSA9IDE7XHJcblxyXG5cclxuICAgICAgICAgICAgIHZhciBfZGVmYXVsdFNpbmdsZUZpbGVVcGxvYWRWYWxpZGF0aW9uRXJyb3JNZXNzYWdlcyA9IHtcclxuICAgICAgICAgICAgICAgICdtYXhTaXplJzogJ1RoaXMgZmlsZSBpcyB0b28gbGFyZ2UgKHt7ZmlsZS5zaXplIC8gMTAwMDAwMCB8IG51bWJlcjoyfX1NQikuIE1heGltdW0gc2l6ZSBhbGxvd2VkIGlzIHt7c2NoZW1hLm1heFNpemUubWF4aW11bX19JyxcclxuICAgICAgICAgICAgICAgICdwYXR0ZXJuJzogJ1dyb25nIGZpbGUgdHlwZS4gQWxsb3dlZCB0eXBlcyBhcmUge3tzY2hlbWEucGF0dGVybi5taW1lVHlwZX19J1xyXG4gICAgICAgICAgICAgIH07XHJcbiAgICAgICAgXHJcbiAgICAgICAgICAgICAgdmFyIF9kZWZhdWx0TXVsdGlGaWxlVXBsb2FkVmFsaWRhdGlvbkVycm9yTWVzc2FnZXMgPSB7XHJcbiAgICAgICAgICAgICAgICAnbWF4U2l6ZSc6IF9kZWZhdWx0U2luZ2xlRmlsZVVwbG9hZFZhbGlkYXRpb25FcnJvck1lc3NhZ2VzLm1heFNpemUsXHJcbiAgICAgICAgICAgICAgICAncGF0dGVybic6IF9kZWZhdWx0U2luZ2xlRmlsZVVwbG9hZFZhbGlkYXRpb25FcnJvck1lc3NhZ2VzLnBhdHRlcm4sXHJcbiAgICAgICAgICAgICAgICAnbWluSXRlbXMnOiAnWW91IGhhdmUgdG8gdXBsb2FkIGF0IGxlYXN0IHt7c2NoZW1hLm1pbkl0ZW1zfX0gZmlsZShzKScsXHJcbiAgICAgICAgICAgICAgICAnbWF4SXRlbXMnOiAnWW91IGNhblxcJ3QgdXBsb2FkIG1vcmUgdGhhbiB7e3NjaGVtYS5tYXhJdGVtc319IGZpbGUocykuJ1xyXG4gICAgICAgICAgICAgIH07XHJcbiAgICAgICAgXHJcbiAgICAgICAgICAgICAgZnVuY3Rpb24gX2FwcGx5RGVmYXVsdFZhbGlkYXRpb25FcnJvck1lc3NhZ2VzIChmb3JtLCBzY2hlbWEsIG1lc3NhZ2VzT2JqZWN0KSB7XHJcbiAgICAgICAgICAgICAgICBmb3JtLnZhbGlkYXRpb25NZXNzYWdlID0gZm9ybS52YWxpZGF0aW9uTWVzc2FnZSB8fCB7fTtcclxuICAgICAgICAgICAgICAgIGZvciAodmFyIGtleXdvcmQgaW4gbWVzc2FnZXNPYmplY3QpIHtcclxuICAgICAgICAgICAgICAgICAgaWYgKHNjaGVtYVtrZXl3b3JkXSAmJiAhZm9ybS52YWxpZGF0aW9uTWVzc2FnZVtrZXl3b3JkXSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGZvcm0udmFsaWRhdGlvbk1lc3NhZ2Vba2V5d29yZF0gPSBtZXNzYWdlc09iamVjdFtrZXl3b3JkXTtcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgICAgICAgIGZ1bmN0aW9uIHJlZ2lzdGVyRGVmYXVsdFR5cGVzICgpIHtcclxuICAgICAgICAgICAgICAgIGZ1bmN0aW9uIG53cFNpbmdsZWZpbGVVcGxvYWREZWZhdWx0UHJvdmlkZXIgKG5hbWUsIHNjaGVtYSwgb3B0aW9ucykge1xyXG4gICAgICAgICAgICAgICAgICBpZiAoc2NoZW1hLnR5cGUgPT09ICdhcnJheScgJiYgc2NoZW1hLmZvcm1hdCA9PT0gJ3NpbmdsZWZpbGUnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGYgPSBzY2hlbWFGb3JtUHJvdmlkZXIuc3RkRm9ybU9iaihuYW1lLCBzY2hlbWEsIG9wdGlvbnMpO1xyXG4gICAgICAgICAgICAgICAgICAgIGYua2V5ID0gb3B0aW9ucy5wYXRoO1xyXG4gICAgICAgICAgICAgICAgICAgIGYudHlwZSA9ICdud3BGaWxlVXBsb2FkJztcclxuICAgICAgICAgICAgICAgICAgICBvcHRpb25zLmxvb2t1cFtzZlBhdGhQcm92aWRlci5zdHJpbmdpZnkob3B0aW9ucy5wYXRoKV0gPSBmO1xyXG4gICAgICAgICAgICAgICAgICAgIF9hcHBseURlZmF1bHRWYWxpZGF0aW9uRXJyb3JNZXNzYWdlcyhmLCBzY2hlbWEsIF9kZWZhdWx0U2luZ2xlRmlsZVVwbG9hZFZhbGlkYXRpb25FcnJvck1lc3NhZ2VzKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZjtcclxuICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgICAgICAgICAgZnVuY3Rpb24gbndwTXVsdGlmaWxlVXBsb2FkRGVmYXVsdFByb3ZpZGVyIChuYW1lLCBzY2hlbWEsIG9wdGlvbnMpIHtcclxuICAgICAgICAgICAgICAgICAgaWYgKHNjaGVtYS50eXBlID09PSAnYXJyYXknICYmIHNjaGVtYS5mb3JtYXQgPT09ICdtdWx0aWZpbGUnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGYgPSBzY2hlbWFGb3JtUHJvdmlkZXIuc3RkRm9ybU9iaihuYW1lLCBzY2hlbWEsIG9wdGlvbnMpO1xyXG4gICAgICAgICAgICAgICAgICAgIGYua2V5ID0gb3B0aW9ucy5wYXRoO1xyXG4gICAgICAgICAgICAgICAgICAgIGYudHlwZSA9ICdud3BGaWxlVXBsb2FkJztcclxuICAgICAgICAgICAgICAgICAgICBvcHRpb25zLmxvb2t1cFtzZlBhdGhQcm92aWRlci5zdHJpbmdpZnkob3B0aW9ucy5wYXRoKV0gPSBmO1xyXG4gICAgICAgICAgICAgICAgICAgIF9hcHBseURlZmF1bHRWYWxpZGF0aW9uRXJyb3JNZXNzYWdlcyhmLCBzY2hlbWEsIF9kZWZhdWx0TXVsdGlGaWxlVXBsb2FkVmFsaWRhdGlvbkVycm9yTWVzc2FnZXMpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBmO1xyXG4gICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgICAgICAgICBzY2hlbWFGb3JtUHJvdmlkZXIuZGVmYXVsdHMuYXJyYXkudW5zaGlmdChud3BTaW5nbGVmaWxlVXBsb2FkRGVmYXVsdFByb3ZpZGVyKTtcclxuICAgICAgICAgICAgICAgIHNjaGVtYUZvcm1Qcm92aWRlci5kZWZhdWx0cy5hcnJheS51bnNoaWZ0KG53cE11bHRpZmlsZVVwbG9hZERlZmF1bHRQcm92aWRlcik7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgICAgICAgIHJlZ2lzdGVyRGVmYXVsdFR5cGVzKCk7XHJcblxyXG4gICAgICAgICAgICAgIHNjaGVtYUZvcm1EZWNvcmF0b3JzUHJvdmlkZXIuZGVmaW5lQWRkT24oXHJcbiAgICAgICAgICAgICAgICAnYm9vdHN0cmFwRGVjb3JhdG9yJyxcclxuICAgICAgICAgICAgICAgICdud3BGaWxlVXBsb2FkJyxcclxuICAgICAgICAgICAgICAgICdkaXJlY3RpdmVzL2RlY29yYXRvcnMvYm9vdHN0cmFwL253cC1maWxlL3NjaGVtYS1mb3JtLWZpbGUuaHRtbCcsXHJcbiAgICAgICAgICAgICAgICAvLyBkZWZhdWx0c1xyXG4gICAgICAgICAgICAgICAgc2ZCdWlsZGVyUHJvdmlkZXIuc3RkQnVpbGRlcnNcclxuICAgICAgICAgICAgKTtcclxuICAgICAgfVxyXG4gICBdKTtcclxuXHJcbmFuZ3VsYXJcclxuICAgLm1vZHVsZSgnbmdTY2hlbWFGb3JtRmlsZScsIFtcclxuICAgICAgJ25nRmlsZVVwbG9hZCcsXHJcbiAgICAgICduZ01lc3NhZ2VzJ1xyXG4gICBdKVxyXG4gICAuZGlyZWN0aXZlKCduZ1NjaGVtYUZpbGUnLCBbJ1VwbG9hZCcsICckdGltZW91dCcsICckcScsICckaW50ZXJwb2xhdGUnLCAnJHRyYW5zbGF0ZScsICdzdWJtaXNzaW9uU2VydmljZScsICdmaWxlU2VydmljZScsIGZ1bmN0aW9uIChVcGxvYWQsICR0aW1lb3V0LCAkcSwgJGludGVycG9sYXRlLCAkdHJhbnNsYXRlLCBzdWJtaXNzaW9uU2VydmljZSwgZmlsZVNlcnZpY2UpIHsvLywgJ3N1Ym1pc3Npb25TZXJ2aWNlJywgJ2ZpbGVTZXJ2aWNlJywgc3VibWlzc2lvblNlcnZpY2UsIGZpbGVTZXJ2aWNlXHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgIHJlc3RyaWN0OiAnQScsXHJcbiAgICAgICAgIHNjb3BlOiAgICB0cnVlLFxyXG4gICAgICAgICByZXF1aXJlOiAgJ25nTW9kZWwnLFxyXG4gICAgICAgICBsaW5rOiAgICAgZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50LCBhdHRycywgbmdNb2RlbCkge1xyXG4gICAgICAgICAgICBzY29wZS51cmwgPSBzY29wZS5mb3JtICYmIHNjb3BlLmZvcm0uZW5kcG9pbnQ7XHJcbiAgICAgICAgICAgIHNjb3BlLmlzU2luZ2xlZmlsZVVwbG9hZCA9IHNjb3BlLmZvcm0gJiYgc2NvcGUuZm9ybS5zY2hlbWEgJiYgc2NvcGUuZm9ybS5zY2hlbWEuZm9ybWF0ID09PSAnc2luZ2xlZmlsZSc7XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgc2NvcGUuZmlsZVNlcnZpY2UgPSBmaWxlU2VydmljZTtcclxuXHJcblxyXG4gICAgICAgICAgICBzY29wZS5zZWxlY3RGaWxlICA9IGZ1bmN0aW9uIChmaWxlLCAkaW52YWxpZEZpbGUpIHtcclxuICAgICAgICAgICAgICAgIHNjb3BlLmludmFsaWRGaWxlID0gJGludmFsaWRGaWxlO1xyXG4gICAgICAgICAgICAgICAgc2NvcGUucGljRmlsZSA9IGZpbGU7XHJcbiAgICAgICAgICAgICAgICBpZiAoZmlsZSAmJiBmaWxlICE9IG51bGwpXHJcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUudXBsb2FkRmlsZShmaWxlKTtcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgc2NvcGUuc2VsZWN0RmlsZXMgPSBmdW5jdGlvbiAoZmlsZXMsICRpbnZhbGlkRmlsZXMpIHtcclxuICAgICAgICAgICAgICAgIHNjb3BlLmludmFsaWRGaWxlcyA9ICRpbnZhbGlkRmlsZXM7XHJcbiAgICAgICAgICAgICAgICBzY29wZS5waWNGaWxlcyA9IGZpbGVzO1xyXG4gICAgICAgICAgICAgICAgaWYgKGZpbGVzICYmIGZpbGVzICE9IG51bGwgJiYgZmlsZXMubGVuZ3RoID4gMClcclxuICAgICAgICAgICAgICAgICAgICBzY29wZS51cGxvYWRGaWxlcyhmaWxlcyk7XHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBzY29wZS51cGxvYWRGaWxlID0gZnVuY3Rpb24gKGZpbGUpIHtcclxuICAgICAgICAgICAgICAgZmlsZSAmJiBkb1VwbG9hZChmaWxlKTtcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIHNjb3BlLnVwbG9hZEZpbGVzID0gZnVuY3Rpb24gKGZpbGVzKSB7XHJcbiAgICAgICAgICAgICAgIGZpbGVzLmxlbmd0aCAmJiBhbmd1bGFyLmZvckVhY2goZmlsZXMsIGZ1bmN0aW9uIChmaWxlKSB7XHJcbiAgICAgICAgICAgICAgICAgIGRvVXBsb2FkKGZpbGUpO1xyXG4gICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICB2YXIgZmlsZVJlc3VsdCA9IG51bGw7XHJcblxyXG4gICAgICAgICAgICBmdW5jdGlvbiBkb1VwbG9hZChmaWxlKSB7XHJcbiAgICAgICAgICAgICAgIGlmIChmaWxlICYmICFmaWxlLiRlcnJvciAmJiBzY29wZS51cmwpIHtcclxuICAgICAgICAgICAgICAgICAgdmFyIG9wdGlvbnMgPSB7XHJcbiAgICAgICAgICAgICAgICAgICAgIHVybDogc2NvcGUudXJsLFxyXG4gICAgICAgICAgICAgICAgICAgICBkYXRhOiB7IFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgZmlsZToge30sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICBldmVudElkOiB7fSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgIHVzZXJJZDoge30sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICBwcmlvcml0eTogc2NvcGUuZm9ybS5zY2hlbWEucHJpb3JpdHlcclxuICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICB9O1xyXG4gICAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgICAgb3B0aW9ucy5kYXRhW3Njb3BlLmZvcm0uZmlsZU5hbWUgfHwgJ2ZpbGUnXSA9IGZpbGU7XHJcbiAgICAgICAgICAgICAgICAgIG9wdGlvbnMuZGF0YVsnZXZlbnRJZCddID0gc3VibWlzc2lvblNlcnZpY2UuZ2V0UmVwb3J0VHlwZSgpLnJlcG9ydFR5cGUudmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgIG9wdGlvbnMuZGF0YVsndXNlcklkJ10gPSBzdWJtaXNzaW9uU2VydmljZS5nZXRVc2VySWQoKTtcclxuICAgICAgICAgICAgICAgICAgZmlsZS51cGxvYWQgPSBVcGxvYWQudXBsb2FkKG9wdGlvbnMpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgZmlsZS51cGxvYWQudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICBmaWxlLnJlc3VsdCA9IHJlc3BvbnNlLmRhdGEubWVzc2FnZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICBmaWxlLnV1aWQgPSBmaWxlUmVzdWx0LmZpbGVbMF0udXVpZDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICBmaWxlLnVwbG9hZENvbXBsZXRlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsZS5wcm9ncmVzcyA9IDEwMDtcclxuICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgZmlsZVJlc3VsdCA9IHNjb3BlLmZvcm0ucG9zdCA/IHNjb3BlLmZvcm0ucG9zdChyZXNwb25zZS5kYXRhKSA6IHJlc3BvbnNlLmRhdGE7XHJcbiAgICAgICAgICAgICAgICAgICAgICBuZ01vZGVsLiRzZXRWaWV3VmFsdWUoZmlsZVJlc3VsdC5maWxlKTtcclxuICAgICAgICAgICAgICAgICAgICAgIG5nTW9kZWwuJGNvbW1pdFZpZXdWYWx1ZSgpO1xyXG4gICAgICAgICAgICAgICAgICB9LCBmdW5jdGlvbiAocmVzcG9uc2UpIHtcclxuICAgICAgICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsZS5lcnJvck1zZyA9IHJlc3BvbnNlLnN0YXR1cyArICc6ICcgKyByZXNwb25zZS5kYXRhLm1lc3NhZ2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHJlc3BvbnNlLnN0YXR1cyA9PSAtMSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGZpbGUuZXJyb3JNc2cgPSBcIkVycm9yOiB0cm91YmxlIGNvbm5lY3RpbmcgdG8gdGhlIHNlcnZlciwgcGxlYXNlIHZlcmlmeSB5b3UgaGF2ZSBpbnRlcm5ldCBhY2Nlc3MuXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgIH0pLnRoZW4oZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgaWYgKGZpbGVSZXN1bHQgJiYgZmlsZVJlc3VsdCAhPSBudWxsICYmIGZpbGVSZXN1bHQuZmlsZSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICBmaWxlU2VydmljZS5zZXRGaWxlKGZpbGVSZXN1bHQuZmlsZVswXSk7XHJcbiAgICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgZmlsZS51cGxvYWQucHJvZ3Jlc3MoZnVuY3Rpb24gKGV2dCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgZmlsZS5wcm9ncmVzcyA9IE1hdGgubWluKDEwMCwgcGFyc2VJbnQoMTAwLjAgKlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgIGV2dC5sb2FkZWQgLyBldnQudG90YWwpKTtcclxuICAgICAgICAgICAgICAgICAgICAgIGlmIChmaWxlLnByb2dyZXNzID09IDEwMCAmJiAhZmlsZS51cGxvYWRDb21wbGV0ZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAvL2JlY2F1c2Ugd2UgbmVlZCB0aGUgcmVzcG9uc2UgdG8gcmV0dXJuLCB3ZSBhcmVuJ3QgdHJ1ZWx5IGF0IDEwMCUgY29tcGxldGUsIHVudGlsIHRoZSByZXBvbnNlIGlzIHJldHVybmVkLiBuZy1maWxlLXVwbG9hZCBzYXlzIHdlJ3JlIGF0IDEwMCUgd2hlbiB0aGUgZmlsZSBpcyBzZW50IHRvIHRoZSBzZXJ2ZXIuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsZS5wcm9ncmVzcyA9IDk5O1xyXG4gICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgZnVuY3Rpb24gX2NsZWFyRXJyb3JNc2cgKCkge1xyXG4gICAgICAgICAgICBkZWxldGUgc2NvcGUuZXJyb3JNc2c7XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgZnVuY3Rpb24gX3Jlc2V0RmllbGROZ01vZGVsIChpc0FycmF5KSB7XHJcbiAgICAgICAgICAgICAgaWYgKGlzQXJyYXkpeyAgICAgICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIG5nTW9kZWwuJHNldFZpZXdWYWx1ZShbXSk7XHJcbiAgICAgICAgICAgICAgfWVsc2Uge1xyXG4gICAgICAgICAgICAgICAgbmdNb2RlbC4kc2V0Vmlld1ZhbHVlKCk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBuZ01vZGVsLiRjb21taXRWaWV3VmFsdWUoKTtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgXHJcbiAgICAgICAgICAvLyBUaGlzIGlzIHRoZSBuZ01vZGVsIG9mIHRoZSBcImZpbGVcIiBpbnB1dCwgaW5zdGVhZCBvZiB0aGUgbmdNb2RlbCBvZiB0aGUgd2hvbGUgZm9ybVxyXG4gICAgICAgICAgZnVuY3Rpb24gX3Jlc2V0RmlsZU5nTW9kZWwgKCkge1xyXG4gICAgICAgICAgICB2YXIgZmlsZU5nTW9kZWwgPSBzY29wZS51cGxvYWRGb3JtLmZpbGU7XHJcbiAgICAgICAgICAgIGZpbGVOZ01vZGVsLiRzZXRWaWV3VmFsdWUoKTtcclxuICAgICAgICAgICAgZmlsZU5nTW9kZWwuJGNvbW1pdFZpZXdWYWx1ZSgpO1xyXG4gICAgICAgICAgICBkZWxldGUgc2NvcGUucGljRmlsZTtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAvLyBUaGlzIGlzIHRoZSBuZ01vZGVsIG9mIHRoZSBcImZpbGVcIiBpbnB1dCwgaW5zdGVhZCBvZiB0aGUgbmdNb2RlbCBvZiB0aGUgd2hvbGUgZm9ybVxyXG4gICAgICAgICAgZnVuY3Rpb24gX3Jlc2V0RmlsZXNOZ01vZGVsIChpbmRleCkge1xyXG4gICAgICAgICAgICB2YXIgZmlsZU5nTW9kZWwgPSBzY29wZS51cGxvYWRGb3JtLmZpbGVzO1xyXG4gICAgICAgICAgICBpZiAoc2NvcGUucGljRmlsZXMubGVuZ3RoID09PSAxKXtcclxuICAgICAgICAgICAgICAgIGZpbGVOZ01vZGVsLiRzZXRWaWV3VmFsdWUoKTtcclxuICAgICAgICAgICAgICAgIGRlbGV0ZSBzY29wZS5waWNGaWxlcztcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHNjb3BlLnBpY0ZpbGVzLnNwbGljZShpbmRleCwgMSk7XHJcbiAgICAgICAgICAgIGZpbGVOZ01vZGVsLiRzZXRWaWV3VmFsdWUoc2NvcGUucGljRmlsZXMpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGZpbGVOZ01vZGVsLiRjb21taXRWaWV3VmFsdWUoKTtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICBzY29wZS5yZW1vdmVJbnZhbGlkRmlsZSA9IGZ1bmN0aW9uIChpbnZhbGlkRmlsZSwgaW5kZXgpe1xyXG4gICAgICAgICAgICBpZiAoc2NvcGUuaXNTaW5nbGVmaWxlVXBsb2FkKXtcclxuICAgICAgICAgICAgICAgIGRlbGV0ZSBzY29wZS5pbnZhbGlkRmlsZTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHNjb3BlLmludmFsaWRGaWxlcy5zcGxpY2UoaW5kZXgsIDEpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgIHNjb3BlLnJlbW92ZUZpbGUgPSBmdW5jdGlvbiAoZmlsZSwgaW5kZXgpIHtcclxuICAgICAgICAgICAgaWYgKHNjb3BlLmlzU2luZ2xlZmlsZVVwbG9hZCl7XHJcbiAgICAgICAgICAgICAgICBpZiAoZmlsZSAmJiBmaWxlLnV1aWQpXHJcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUuZmlsZVNlcnZpY2UuZGVsZXRlRmlsZShmaWxlLnV1aWQpO1xyXG5cclxuICAgICAgICAgICAgICAgIF9jbGVhckVycm9yTXNnKCk7XHJcbiAgICAgICAgICAgICAgICBfcmVzZXRGaWVsZE5nTW9kZWwodHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICBfcmVzZXRGaWxlTmdNb2RlbCgpO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoZmlsZSAmJiBmaWxlLnV1aWQpXHJcbiAgICAgICAgICAgICAgICAgICAgc2NvcGUuZmlsZVNlcnZpY2UuZGVsZXRlRmlsZShmaWxlLnV1aWQpO1xyXG5cclxuICAgICAgICAgICAgICAgIF9jbGVhckVycm9yTXNnKCk7XHJcbiAgICAgICAgICAgICAgICBfcmVzZXRGaWVsZE5nTW9kZWwodHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICBfcmVzZXRGaWxlc05nTW9kZWwoaW5kZXgpO1xyXG4gICAgICAgICAgICAgICAgXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgc2NvcGUudmFsaWRhdGVGaWVsZCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgaWYgKHNjb3BlLnVwbG9hZEZvcm0uZmlsZSAmJiBzY29wZS51cGxvYWRGb3JtLmZpbGUuJHZhbGlkICYmIHNjb3BlLnBpY0ZpbGUgJiYgIXNjb3BlLnBpY0ZpbGUuJGVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzaW5nbGVmaWxlLWZvcm0gaXMgaW52YWxpZCcpO1xyXG4gICAgICAgICAgICAgICB9IGVsc2UgaWYgKHNjb3BlLnVwbG9hZEZvcm0uZmlsZXMgJiYgc2NvcGUudXBsb2FkRm9ybS5maWxlcy4kdmFsaWQgJiYgc2NvcGUucGljRmlsZXMgJiYgIXNjb3BlLnBpY0ZpbGVzLiRlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZygnbXVsdGlmaWxlLWZvcm0gaXMgIGludmFsaWQnKTtcclxuICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coJ3NpbmdsZS0gYW5kIG11bHRpZmlsZS1mb3JtIGFyZSB2YWxpZCcpO1xyXG4gICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBzY29wZS5zdWJtaXQgICAgICAgID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICBpZiAoc2NvcGUudXBsb2FkRm9ybS5maWxlICYmIHNjb3BlLnVwbG9hZEZvcm0uZmlsZS4kdmFsaWQgJiYgc2NvcGUucGljRmlsZSAmJiAhc2NvcGUucGljRmlsZS4kZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgc2NvcGUudXBsb2FkRmlsZShzY29wZS5waWNGaWxlKTtcclxuICAgICAgICAgICAgICAgfSBlbHNlIGlmIChzY29wZS51cGxvYWRGb3JtLmZpbGVzICYmIHNjb3BlLnVwbG9hZEZvcm0uZmlsZXMuJHZhbGlkICYmIHNjb3BlLnBpY0ZpbGVzICYmICFzY29wZS5waWNGaWxlcy4kZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgc2NvcGUudXBsb2FkRmlsZXMoc2NvcGUucGljRmlsZXMpO1xyXG4gICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBzY29wZS4kb24oJ3NjaGVtYUZvcm1WYWxpZGF0ZScsIHNjb3BlLnZhbGlkYXRlRmllbGQpO1xyXG4gICAgICAgICAgICBzY29wZS4kb24oJ3NjaGVtYUZvcm1GaWxlVXBsb2FkU3VibWl0Jywgc2NvcGUuc3VibWl0KTtcclxuXHJcbiAgICAgICAgICAgIHNjb3BlLmludGVycFZhbGlkYXRpb25NZXNzYWdlID0gZnVuY3Rpb24gaW50ZXJwVmFsaWRhdGlvbk1lc3NhZ2UgKGVycm9yVHlwZSwgaW52YWxpZEZpbGUpIHtcclxuICAgICAgICAgICAgICAgIGlmICghaW52YWxpZEZpbGUpIHtcclxuICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIHZhciBlcnJvciA9IGVycm9yVHlwZTsvL2ludmFsaWRGaWxlLiRlcnJvcjsgLy8gZS5nLiwgJ21heFNpemUnXHJcbiAgICAgICAgICAgICAgICB2YXIgZm9ybSA9IHNjb3BlLmZvcm07XHJcbiAgICAgICAgICAgICAgICB2YXIgdmFsaWRhdGlvbk1lc3NhZ2UgPSBmb3JtICYmIGZvcm0uc2NoZW1hID8gZm9ybS52YWxpZGF0aW9uTWVzc2FnZSA6IGZvcm0uc2NoZW1hLnZhbGlkYXRpb25NZXNzYWdlID8gZm9ybS5zY2hlbWEudmFsaWRhdGlvbk1lc3NhZ2UgOiB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgICAgICB2YXIgbWVzc2FnZTtcclxuICAgICAgICAgICAgICAgIGlmIChhbmd1bGFyLmlzU3RyaW5nKHZhbGlkYXRpb25NZXNzYWdlKSkge1xyXG4gICAgICAgICAgICAgICAgICBtZXNzYWdlID0gdmFsaWRhdGlvbk1lc3NhZ2U7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKGFuZ3VsYXIuaXNPYmplY3QodmFsaWRhdGlvbk1lc3NhZ2UpKSB7XHJcbiAgICAgICAgICAgICAgICAgIG1lc3NhZ2UgPSB2YWxpZGF0aW9uTWVzc2FnZVtlcnJvcl07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIFxyXG4gICAgICAgICAgICAgICAgaWYgKCFtZXNzYWdlKSB7XHJcbiAgICAgICAgICAgICAgICAgIHJldHVybiBlcnJvcjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgXHJcbiAgICAgICAgICAgICAgICB2YXIgY29udGV4dCA9IHtcclxuICAgICAgICAgICAgICAgICAgZXJyb3I6IGVycm9yLFxyXG4gICAgICAgICAgICAgICAgICBmaWxlOiBpbnZhbGlkRmlsZSxcclxuICAgICAgICAgICAgICAgICAgZm9ybTogZm9ybSxcclxuICAgICAgICAgICAgICAgICAgc2NoZW1hOiBmb3JtLnNjaGVtYSxcclxuICAgICAgICAgICAgICAgICAgdGl0bGU6IGZvcm0udGl0bGUgfHwgKGZvcm0uc2NoZW1hICYmIGZvcm0uc2NoZW1hLnRpdGxlKVxyXG4gICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgIHZhciBpbnRlcnBvbGF0ZWRNZXNzYWdlID0gJGludGVycG9sYXRlKG1lc3NhZ2UpKGNvbnRleHQpO1xyXG4gICAgICAgICAgICBcclxuICAgICAgICAgICAgICAgIHJldHVybiAkdHJhbnNsYXRlLmluc3RhbnQoaW50ZXJwb2xhdGVkTWVzc2FnZSk7XHJcbiAgICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgIH1cclxuICAgICAgfTtcclxuICAgfV0pO1xyXG4iLG51bGxdfQ==
