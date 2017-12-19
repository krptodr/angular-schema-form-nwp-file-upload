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
            _resetFieldNgModel(false);
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
            console.log('singlefile-form is valid');
          } else if (scope.uploadForm.files && scope.uploadForm.files.$valid && scope.picFiles && !scope.picFiles.$error) {
            console.log('multifile-form is  valid');
          } else {
            console.log('single- and multifile-form are invalid');
            return false;
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
angular.module("schemaForm").run(["$templateCache", function($templateCache) {$templateCache.put("directives/decorators/bootstrap/nwp-file/nwp-file.html","<ng-form class=\"file-upload mb-lg\" ng-schema-file ng-model=\"$$value$$\" name=\"uploadForm\">\r\n    <label ng-show=\"form.title && form.notitle !== true\" class=\"control-label\" for=\"fileInputButton\" ng-class=\"{\'sr-only\': !showTitle(), \'text-danger\': uploadForm.$error.required && !uploadForm.$pristine}\">\r\n        {{ form.title }}<i ng-show=\"form.required\">&nbsp;*</i>\r\n    </label>\r\n    <div ng-show=\"picFile\">\r\n        <div ng-include=\"\'uploadProcess.html\'\" class=\"mb\"></div>\r\n    </div>\r\n    <ul ng-show=\"picFiles && picFiles.length\" class=\"list-group\">\r\n        <li class=\"list-group-item\" ng-repeat=\"picFile in picFiles\">\r\n            <div ng-include=\"\'uploadProcess.html\'\"></div>\r\n        </li>\r\n    </ul>\r\n    <div class=\"well well-sm bg-white mb\" ng-class=\"{\'has-error border-danger\': (uploadForm.$error.required && !uploadForm.$pristine) || (hasError() && errorMessage(schemaError()))}\">\r\n        <small class=\"text-muted\" ng-show=\"form.description\" ng-bind-html=\"form.description\"></small>\r\n        <div ng-if=\"isSinglefileUpload\" ng-include=\"\'singleFileUpload.html\'\"></div>\r\n        <div ng-if=\"!isSinglefileUpload\" ng-include=\"\'multiFileUpload.html\'\"></div>\r\n        <div class=\"help-block mb0\" ng-show=\"uploadForm.$error.required && !uploadForm.$pristine\">{{ \'modules.attribute.fields.required.caption\' | translate }}</div>\r\n        <div class=\"help-block mb0\" ng-show=\"(hasError() && errorMessage(schemaError()))\" ng-bind-html=\"(hasError() && errorMessage(schemaError()))\"></div>\r\n    </div>\r\n</ng-form>\r\n<script type=\'text/ng-template\' id=\"uploadProcess.html\">\r\n    <div class=\"row mb\">\r\n        <div class=\"col-sm-4 mb-sm\">\r\n            <label title=\"{{ form.i18n.preview? form.i18n.preview : (\'modules.upload.field.preview\' | translate)}}\" class=\"text-info\">{{ form.i18n.preview? form.i18n.preview : (\'modules.upload.field.preview\' | translate)}}</label>\r\n            <img ngf-src=\"picFile\" class=\"img-thumbnail img-responsive\">\r\n            <div class=\"img-placeholder\" ng-class=\"{\'show\': picFile.$invalid && !picFile.blobUrl, \'hide\': !picFile || picFile.blobUrl}\">No preview available\r\n            </div>\r\n        </div>\r\n        <div class=\"col-sm-4 mb-sm\">\r\n            <label title=\"{{ form.i18n.filename ? form.i18n.filename : (\'modules.upload.field.filename\' | translate)  }}\" class=\"text-info\">{{ form.i18n.filename ? form.i18n.filename : (\'modules.upload.field.filename\' | translate)}}</label>\r\n            <div class=\"filename\" title=\"{{ picFile.name }}\">{{ picFile.name }}</div>\r\n        </div>\r\n        <div class=\"col-sm-4 mb-sm\">\r\n            <label title=\"{{ form.i18n.progress ? form.i18n.progress : (\'modules.upload.field.progress\' | translate)  }}\" class=\"text-info\">{{ form.i18n.progress ? form.i18n.progress : (\'modules.upload.field.progress\' | translate) }}</label>\r\n            <div class=\"progress\">\r\n                <div class=\"progress-bar progress-bar-striped\" role=\"progressbar\" ng-class=\"{\'progress-bar-success\': picFile.progress == 100}\" ng-style=\"{width: picFile.progress + \'%\'}\">\r\n                    {{ picFile.progress }} %\r\n                </div>\r\n            </div>\r\n            <button class=\"btn btn-primary btn-sm\" type=\"button\" ng-click=\"uploadFile(picFile)\" ng-disabled=\"!picFile || picFile.$error\">{{ form.i18n.upload ? form.i18n.upload : (\'buttons.upload\' | translate) }}\r\n            </button>\r\n        </div>\r\n    </div>\r\n    <div ng-messages=\"uploadForm.$error\" ng-messages-multiple=\"\">\r\n        <div class=\"text-danger errorMsg\" ng-message=\"maxSize\">{{ form[picFile.$error].validationMessage | translate }} <strong>{{picFile.$errorParam}}</strong>. ({{ form[picFile.$error].validationMessage2 | translate }} <strong>{{picFile.size / 1000000|number:1}}MB</strong>)</div>\r\n        <div class=\"text-danger errorMsg\" ng-message=\"pattern\">{{ form[picFile.$error].validationMessage | translate }} <strong>{{picFile.$errorParam}}</strong></div>\r\n        <div class=\"text-danger errorMsg\" ng-message=\"maxItems\">{{ form[picFile.$error].validationMessage | translate }} <strong>{{picFile.$errorParam}}</strong></div>\r\n        <div class=\"text-danger errorMsg\" ng-message=\"minItems\">{{ form[picFile.$error].validationMessage | translate }} <strong>{{picFile.$errorParam}}</strong></div>\r\n        <div class=\"text-danger errorMsg\" ng-show=\"errorMsg\">{{errorMsg}}</div>\r\n    </div>\r\n</script>\r\n<script type=\'text/ng-template\' id=\"singleFileUpload.html\">\r\n    <div ngf-drop=\"selectFile(picFile)\" ngf-select=\"selectFile(picFile)\" type=\"file\" ngf-multiple=\"false\" ng-model=\"picFile\" name=\"file\" ng-attr-ngf-pattern=\"{{form.schema.pattern && form.schema.pattern.mimeType ? form.schema.pattern.mimeType : undefined }}\" ng-attr-ngf-max-size=\"{{form.schema.maxSize && form.schema.maxSize.maximum ? form.schema.maxSize.maximum : undefined }}\" ng-required=\"form.required\" accept=\"{{form.schema.pattern && form.schema.pattern.mimeType}}\" ng-model-options=\"form.ngModelOptions\" ngf-drag-over-class=\"dragover\" class=\"drop-box dragAndDropDescription\">\r\n        <p class=\"text-center\">{{form.i18n.dragorclick ? form.i18n.dragorclick:(\'modules.upload.descriptionSinglefile\' | translate)}}</p>\r\n    </div>\r\n    <div ngf-no-file-drop>{{ \'modules.upload.dndNotSupported\' | translate}}</div>\r\n    <button ngf-select=\"selectFile(picFile)\" type=\"file\" ngf-multiple=\"false\" ng-model=\"picFile\" name=\"file\" ng-attr-ngf-pattern=\"{{form.schema.pattern && form.schema.pattern.mimeType ? form.schema.pattern.mimeType : undefined }}\" ng-attr-ngf-max-size=\"{{form.schema.maxSize && form.schema.maxSize.maximum ? form.schema.maxSize.maximum : undefined }}\" ng-required=\"form.required\" accept=\"{{form.schema.pattern && form.schema.pattern.mimeType}}\" ng-model-options=\"form.ngModelOptions\" id=\"fileInputButton\" class=\"btn btn-primary btn-block {{form.htmlClass}} mt-lg mb\">\r\n        <fa fw=\"fw\" name=\"upload\" class=\"mr-sm\"></fa>\r\n        {{form.i18n.add ? form.i18n.add : (\'buttons.add\' | translate)}}\r\n    </button>\r\n</script>\r\n<script type=\'text/ng-template\' id=\"multiFileUpload.html\">\r\n    <div ngf-drop=\"selectFiles(picFiles)\" ngf-select=\"selectFiles(picFiles)\" type=\"file\" ngf-multiple=\"true\" ng-model=\"picFiles\" name=\"files\" ng-attr-ngf-pattern=\"{{form.schema.pattern && form.schema.pattern.mimeType ? form.schema.pattern.mimeType : undefined }}\" ng-attr-ngf-max-size=\"{{form.schema.maxSize && form.schema.maxSize.maximum ? form.schema.maxSize.maximum : undefined }}\" ng-required=\"form.required\" accept=\"{{form.schema.pattern && form.schema.pattern.mimeType}}\" ng-model-options=\"form.ngModelOptions\" ngf-drag-over-class=\"dragover\" class=\"drop-box dragAndDropDescription\">\r\n        <p class=\"text-center\">{{form.i18n.dragorclick ? form.i18n.dragorclick:(\'modules.upload.descriptionMultifile\' | translate)}}</p>\r\n    </div>\r\n    <div ngf-no-file-drop>{{ \'modules.upload.dndNotSupported\' | translate}}</div>\r\n    <button ngf-select=\"selectFiles(picFiles)\" type=\"file\" ngf-multiple=\"true\" multiple ng-model=\"picFiles\" name=\"files\" accept=\"{{form.schema.pattern && form.schema.pattern.mimeType}}\" ng-attr-ngf-pattern=\"{{form.schema.pattern && form.schema.pattern.mimeType ? form.schema.pattern.mimeType : undefined }}\" ng-attr-ngf-max-size=\"{{form.schema.maxSize && form.schema.maxSize.maximum ? form.schema.maxSize.maximum : undefined }}\" ng-required=\"form.required\" ng-model-options=\"form.ngModelOptions\" id=\"fileInputButton\" class=\"btn btn-primary btn-block {{form.htmlClass}} mt-lg mb\">\r\n        <fa fw=\"fw\" name=\"upload\" class=\"mr-sm\"></fa>\r\n        {{form.i18n.add ? form.i18n.add : (\'buttons.add\' | translate)}}\r\n    </button>\r\n</script>");
$templateCache.put("directives/decorators/bootstrap/nwp-file/schema-form-file.html","<ng-form class=\"file-upload mb-lg\" ng-schema-file  sf-field-model=\"replaceAll\" schema-validate=\"form\" ng-model=\"$$value$$\" ng-model-options=\"form.ngModelOptions\"\r\n  name=\"uploadForm\">\r\n  <!--sf-field-model=\"replaceAll\"schema-validate=\"form\" sf-field-model=\"replaceAll\"-->\r\n  <label ng-show=\"form.title && form.notitle !== true\" class=\"control-label\" for=\"fileInputButton\" ng-class=\"{\'sr-only\': !showTitle(), \'text-danger\': uploadForm.$error.required && !uploadForm.$pristine}\">\r\n    {{::form.title}}\r\n    <i ng-show=\"form.required\">&nbsp;*</i>\r\n  </label>\r\n\r\n  <div ng-show=\"picFile && !picFile.$error\" class=\"well well-sm bg-white mb\" ng-class=\"{\'has-error border-danger\': (uploadForm.$error.required && !uploadForm.$pristine) || (hasError() && errorMessage(schemaError()))}\">\r\n    <ul class=\"list-group\">\r\n      <li class=\"list-group-item\">\r\n        <div ng-include=\"\'directives/decorators/bootstrap/nwp-file/schema-form-file.template.progress.html\'\" ></div>\r\n        <span ng-show=\"picFile.errorMsg\" class=\"help-block has-error mb0\">{{ picFile.errorMsg }}</span>\r\n      </li>\r\n    </ul>    \r\n    <!-- <div ng-include=\"\'directives/decorators/bootstrap/nwp-file/schema-form-file.template.errors.html\'\" class=\"mb\"></div> -->\r\n    <span class=\"help-block\" sf-message=\"form.description\"></span>\r\n  </div>\r\n\r\n  <div ng-show=\"invalidFile\" class=\"well well-sm mb\">\r\n    <label title=\"Invalid Files\" style=\"color:#a94442\" class=\"text-info\">Invalid File</label>\r\n\r\n    <div ng-class=\"{\'has-error border-danger\': (uploadForm.$error.required && !uploadForm.$pristine) || (hasError() && errorMessage(schemaError()))}\">\r\n\r\n      <ul class=\"list-group\" ng-show=\"invalidFile\">\r\n        <li class=\"list-group-item\" style=\"border-color:#a94442;display:block;height: auto;padding:0px;\">\r\n          <!--ng-repeat=\"invalidFile in invalidFiles\"-->\r\n\r\n          <div class=\"row\">\r\n            <span class=\"col-xs-5 col-sm-5 col-md-5\" title=\"{{invalidFile.name}}\"> {{invalidFile.name}} </span>\r\n            <div class=\"col-xs-6 col-sm-6 text-danger errorMsg col-md-6\" ng-include=\"\'directives/decorators/bootstrap/nwp-file/schema-form-file.template.errors.html\'\"></div>\r\n            <div class=\"col-xs-1 col-sm-1 col-md-1\">\r\n                <button class=\"btn btn-xs btn-danger\" type=\"button\" ng-click=\"removeInvalidFile(invalidFile)\">\r\n                    <span class=\"glyphicon glyphicon-remove\"></span>\r\n                </button></div>\r\n          </div>\r\n        </li>\r\n      </ul>\r\n    </div>\r\n  </div>\r\n\r\n\r\n\r\n  <ul ng-show=\"picFiles && picFiles.length\" class=\"list-group\">\r\n    <li class=\"list-group-item\" ng-repeat=\"picFile in picFiles\">\r\n      <div ng-include=\"\'directives/decorators/bootstrap/nwp-file/schema-form-file.template.progress.html\'\"></div>\r\n      <span ng-show=\"picFile.errorMsg\" class=\"help-block has-error mb0\">{{ picFile.errorMsg }}</span>\r\n      <!-- <div ng-include=\"\'directives/decorators/bootstrap/nwp-file/schema-form-file.template.errors.html\'\" class=\"mb\"></div> -->\r\n    </li>\r\n  </ul>\r\n\r\n  <div ng-show=\"(invalidFiles && invalidFiles.length)\" class=\"well well-sm mb\">\r\n      <label title=\"Invalid Files\" style=\"color:#a94442\" class=\"text-info\">Invalid Files</label>\r\n  \r\n      <div ng-show=\"(invalidFiles && invalidFiles.length)\" ng-class=\"{\'has-error border-danger\': (uploadForm.$error.required && !uploadForm.$pristine) || (hasError() && errorMessage(schemaError()))}\">\r\n  \r\n        <ul class=\"list-group\" ng-show=\"(invalidFiles && invalidFiles.length)\">\r\n          <li class=\"list-group-item\" style=\"border-color:#a94442;display:block;height: auto;padding:0px;\" ng-repeat=\"invalidFile in invalidFiles\">\r\n            <!---->\r\n  \r\n            <div class=\"row\">\r\n              <span class=\"col-xs-5 col-sm-5 col-md-5\" title=\"{{invalidFile.name}}\"> {{invalidFile.name}} </span>\r\n              <div class=\"col-xs-6 col-sm-6 text-danger errorMsg col-md-6\" ng-include=\"\'directives/decorators/bootstrap/nwp-file/schema-form-file.template.errors.html\'\"></div>\r\n              <div class=\"col-xs-1 col-sm-1 col-md-1\">\r\n                  <button class=\"btn btn-xs btn-danger\" type=\"button\" ng-click=\"removeInvalidFile(invalidFile, $index)\">\r\n                      <span class=\"glyphicon glyphicon-remove\"></span>\r\n                  </button></div>\r\n            </div>\r\n          </li>\r\n        </ul>\r\n      </div>\r\n    </div>\r\n\r\n  <div ng-show=\"(isSinglefileUpload && !picFile) || (!isSinglefileUpload && (!picFiles || !picFiles.length))\" class=\"well well-sm bg-white mb\"\r\n    ng-class=\"{\'has-error border-danger\': (uploadForm.$error.required && !uploadForm.$pristine) || (hasError() && errorMessage(schemaError()))}\">\r\n    <small class=\"text-muted\" ng-show=\"form.description\" ng-bind-html=\"form.description\"></small>\r\n    <div ng-if=\"isSinglefileUpload\" ng-include=\"\'directives/decorators/bootstrap/nwp-file/schema-form-file.template.single.html\'\"></div>\r\n    <div ng-if=\"!isSinglefileUpload\" ng-include=\"\'directives/decorators/bootstrap/nwp-file/schema-form-file.template.multiple.html\'\"></div>\r\n    <div class=\"help-block mb0\" ng-if=\"uploadForm.$error.required && !uploadForm.$pristine\">{{ \'modules.attribute.fields.required.caption\' | translate }}</div>\r\n    <span ng-show=\"errorMsg\" class=\"help-block text-danger mb0\">Error: {{ errorMsg }}</span>\r\n    <span class=\"help-block\" sf-message=\"form.description\"></span>\r\n  </div>\r\n</ng-form>");
$templateCache.put("directives/decorators/bootstrap/nwp-file/schema-form-file.template.errors.html","<div ng-messages=\"uploadForm.$error\" ng-messages-multiple=\"\">\r\n  <div class=\"text-danger errorMsg\" ng-message=\"pattern\">{{ interpValidationMessage(\'pattern\', invalidFile)  }}</div>\r\n  <div class=\"text-danger errorMsg\" ng-message=\"maxSize\">{{ interpValidationMessage(\'maxSize\', invalidFile) }}</div>\r\n  <div class=\"text-danger errorMsg\" ng-message=\"maxItems\">{{ interpValidationMessage(\'maxItems\', invalidFile) }}</div>\r\n  <div class=\"text-danger errorMsg\" ng-message=\"minItems\">{{ interpValidationMessage(\'minItems\', invalidFile)}}</div>\r\n  <div class=\"text-danger errorMsg\" ng-show=\"errorMsg\">Error: {{ errorMsg }}</div>\r\n</div>");
$templateCache.put("directives/decorators/bootstrap/nwp-file/schema-form-file.template.multiple.html","<div ngf-drop=\"selectFiles(picFiles, $invalidFiles)\" ngf-select=\"selectFiles(picFiles, $invalidFiles)\" type=\"file\" ngf-multiple=\"true\"\r\n    ng-model=\"picFiles\" name=\"files\"\r\n    ng-attr-ngf-pattern=\"{{form.schema.pattern && form.schema.pattern.mimeType ? form.schema.pattern.mimeType : undefined }}\"\r\n    ng-attr-ngf-max-size=\"{{form.schema.maxSize && form.schema.maxSize.maximum ? form.schema.maxSize.maximum : undefined }}\"\r\n    ng-required=\"form.required\"\r\n    accept=\"{{::form.schema.pattern.mimeType}}\"\r\n    ng-model-options=\"form.ngModelOptions\" ngf-drag-over-class=\"dragover\" class=\"drop-box dragAndDropDescription\">\r\n  <p class=\"text-center\">{{ \'modules.upload.descriptionMultifile\' | translate }}</p>\r\n</div>\r\n<div ngf-no-file-drop>{{ \'modules.upload.dndNotSupported\' | translate}}</div>");
$templateCache.put("directives/decorators/bootstrap/nwp-file/schema-form-file.template.progress.html","<div class=\"row mb\">\r\n    <!---->\r\n    <div class=\"col-xs-1 mb-sm\">\r\n        <!---->\r\n        <label title=\"Result\" class=\"text-info\">&nbsp;</label>\r\n        <div class=\"img-placeholder\">\r\n            <span class=\"fa fa-2x\" aria-hidden=\"true\" ng-class=\"{\'fa-check-circle-o text-success show\': picFile.result && picFile.progress == 100,\r\n                        \'fa-exclamation-circle show text-danger\': picFile.errorMsg,\r\n                        \'fa-refresh fa-spin fa-fw text-primary show\': (picFile.progress >= 0 && picFile.progress < 100) && !picFile.errorMsg}\"\r\n                uib-tooltip=\"{{ (picFile.progress >= 0 && picFile.progress < 100 && !picFile.errorMsg) ? \'Uploading...\' : picFile.result && !picFile.errorMsg ? picFile.result : (picFile.errorMsg) ? \'See message below for more details.\' : \'\'}}\"\r\n                tooltip-placement=\"top\" tooltip-trigger=\"\'mouseenter\'\">\r\n                <!--, \'hide\': !picFile.progress || picFile.progress != 100-->\r\n            </span>\r\n\r\n        </div>\r\n    </div>\r\n    <div class=\"col-xs-9 col-sm-6 mb-sm\">\r\n        <!--col-sm-8 -->\r\n        <label title=\"{{ form.i18n.filename ? form.i18n.filename : (\'modules.upload.field.filename\' | translate)  }}\" class=\"text-info\">{{ form.i18n.filename ? form.i18n.filename : (\'modules.upload.field.filename\' | translate)}}</label>\r\n        <div class=\"filename\" title=\"{{ picFile.name }}\">{{ picFile.name }}</div>\r\n    </div>\r\n\r\n    \r\n    <div class=\"col-sm-2 hidden-xs\">\r\n            <label title=\"Result\" class=\"text-info\">Size</label>\r\n            <small ng-switch=\"fileService.file.size > 1024*1024\">\r\n                <small ng-switch-when=\"true\">({{picFile.size / 1024 / 1024 | number:2}} Mb)</small>\r\n                <small ng-switch-default>({{picFile.size / 1024 | number:2}} kB)</small>\r\n            </small>\r\n        </div>\r\n\r\n    <div class=\"col-xs-5 col-sm-2 hidden-xs mb-sm\">\r\n        <!--col-sm-2 -->\r\n        <label title=\"{{ form.i18n.progress ? form.i18n.progress : (\'modules.upload.field.progress\' | translate)  }}\" class=\"text-info\">{{ form.i18n.progress ? form.i18n.progress : (\'modules.upload.field.progress\' | translate) }}</label>\r\n        <div class=\"progress\">\r\n            <div class=\"progress-bar progress-bar-striped\" role=\"progressbar\" ng-class=\"{\'progress-bar-success\': picFile.progress == 100, \'progress-bar-danger\': picFile.errorMsg}\"\r\n                ng-style=\"{width: picFile.progress + \'%\'}\">\r\n                {{ picFile.progress ? picFile.progress : 0 }} %\r\n            </div>\r\n        </div>\r\n    </div>\r\n    <div class=\"col-xs-1 col-sm-1 mb-sm\">\r\n        <label title=\"Result\" class=\"text-info\">&nbsp;</label>\r\n        <!--col-sm-1 -->\r\n        <button class=\"btn btn-xs btn-danger\" type=\"button\" ng-click=\"removeFile(picFile, $index)\">\r\n            <span class=\"glyphicon glyphicon-remove\"></span>\r\n        </button>\r\n    </div>\r\n</div>");
$templateCache.put("directives/decorators/bootstrap/nwp-file/schema-form-file.template.single.html","<div ngf-drop=\"selectFile(picFile, $invalidFile)\" ngf-select=\"selectFile(picFile, $invalidFile)\" type=\"file\" ngf-multiple=\"false\" ngf-invalid-model=\"$invalidFile\"\r\n    ng-model=\"picFile\" name=\"file\"\r\n    ngf-run-all-validations=\"true\"\r\n    ng-attr-ngf-pattern=\"{{form.schema.pattern && form.schema.pattern.mimeType ? form.schema.pattern.mimeType : undefined }}\"\r\n    ng-attr-ngf-max-size=\"{{form.schema.maxSize && form.schema.maxSize.maximum ? form.schema.maxSize.maximum : undefined }}\"\r\n    ng-required=\"form.required\"\r\n    accept=\"{{::form.schema.pattern.mimeType}}\"\r\n    ng-model-options=\"form.ngModelOptions\" ngf-drag-over-class=\"dragover\" class=\"drop-box dragAndDropDescription\">\r\n  <p class=\"text-center\">{{ \'modules.upload.descriptionSinglefile\' | translate }}</p>\r\n</div>\r\n<div ngf-no-file-drop>{{ \'modules.upload.dndNotSupported\' | translate}}</div>\r\n");}]);
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNjaGVtYS1mb3JtLWZpbGUuanMiLCJ0ZW1wbGF0ZXMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzhFQ2pUQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoic2NoZW1hLWZvcm0tZmlsZS5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBhbmd1bGFyLXNjaGVtYS1mb3JtLW53cC1maWxlLXVwbG9hZCAtIFVwbG9hZCBmaWxlIHR5cGUgZm9yIEFuZ3VsYXIgU2NoZW1hIEZvcm1cclxuICogQHZlcnNpb24gdjAuMS41XHJcbiAqIEBsaW5rIGh0dHBzOi8vZ2l0aHViLmNvbS9zYWJ1cmFiL2FuZ3VsYXItc2NoZW1hLWZvcm0tbndwLWZpbGUtdXBsb2FkXHJcbiAqIEBsaWNlbnNlIE1JVFxyXG4gKi9cclxuJ3VzZSBzdHJpY3QnO1xyXG5cclxuYW5ndWxhclxyXG4gIC5tb2R1bGUoJ3NjaGVtYUZvcm0nKVxyXG4gIC5jb25maWcoWydzY2hlbWFGb3JtUHJvdmlkZXInLCAnc2NoZW1hRm9ybURlY29yYXRvcnNQcm92aWRlcicsICdzZlBhdGhQcm92aWRlcicsICdzZkJ1aWxkZXJQcm92aWRlcicsXHJcbiAgICBmdW5jdGlvbiAoc2NoZW1hRm9ybVByb3ZpZGVyLCBzY2hlbWFGb3JtRGVjb3JhdG9yc1Byb3ZpZGVyLCBzZlBhdGhQcm92aWRlciwgc2ZCdWlsZGVyUHJvdmlkZXIpIHtcclxuICAgICAgdmFyIGRlZmF1bHRQcmlvcml0eSA9IDE7XHJcblxyXG5cclxuICAgICAgdmFyIF9kZWZhdWx0U2luZ2xlRmlsZVVwbG9hZFZhbGlkYXRpb25FcnJvck1lc3NhZ2VzID0ge1xyXG4gICAgICAgICdtYXhTaXplJzogJ1RoaXMgZmlsZSBpcyB0b28gbGFyZ2UgKHt7ZmlsZS5zaXplIC8gMTAwMDAwMCB8IG51bWJlcjoyfX1NQikuIE1heGltdW0gc2l6ZSBhbGxvd2VkIGlzIHt7c2NoZW1hLm1heFNpemUubWF4aW11bX19JyxcclxuICAgICAgICAncGF0dGVybic6ICdXcm9uZyBmaWxlIHR5cGUuIEFsbG93ZWQgdHlwZXMgYXJlIHt7c2NoZW1hLnBhdHRlcm4ubWltZVR5cGV9fSdcclxuICAgICAgfTtcclxuXHJcbiAgICAgIHZhciBfZGVmYXVsdE11bHRpRmlsZVVwbG9hZFZhbGlkYXRpb25FcnJvck1lc3NhZ2VzID0ge1xyXG4gICAgICAgICdtYXhTaXplJzogX2RlZmF1bHRTaW5nbGVGaWxlVXBsb2FkVmFsaWRhdGlvbkVycm9yTWVzc2FnZXMubWF4U2l6ZSxcclxuICAgICAgICAncGF0dGVybic6IF9kZWZhdWx0U2luZ2xlRmlsZVVwbG9hZFZhbGlkYXRpb25FcnJvck1lc3NhZ2VzLnBhdHRlcm4sXHJcbiAgICAgICAgJ21pbkl0ZW1zJzogJ1lvdSBoYXZlIHRvIHVwbG9hZCBhdCBsZWFzdCB7e3NjaGVtYS5taW5JdGVtc319IGZpbGUocyknLFxyXG4gICAgICAgICdtYXhJdGVtcyc6ICdZb3UgY2FuXFwndCB1cGxvYWQgbW9yZSB0aGFuIHt7c2NoZW1hLm1heEl0ZW1zfX0gZmlsZShzKS4nXHJcbiAgICAgIH07XHJcblxyXG4gICAgICBmdW5jdGlvbiBfYXBwbHlEZWZhdWx0VmFsaWRhdGlvbkVycm9yTWVzc2FnZXMoZm9ybSwgc2NoZW1hLCBtZXNzYWdlc09iamVjdCkge1xyXG4gICAgICAgIGZvcm0udmFsaWRhdGlvbk1lc3NhZ2UgPSBmb3JtLnZhbGlkYXRpb25NZXNzYWdlIHx8IHt9O1xyXG4gICAgICAgIGZvciAodmFyIGtleXdvcmQgaW4gbWVzc2FnZXNPYmplY3QpIHtcclxuICAgICAgICAgIGlmIChzY2hlbWFba2V5d29yZF0gJiYgIWZvcm0udmFsaWRhdGlvbk1lc3NhZ2Vba2V5d29yZF0pIHtcclxuICAgICAgICAgICAgZm9ybS52YWxpZGF0aW9uTWVzc2FnZVtrZXl3b3JkXSA9IG1lc3NhZ2VzT2JqZWN0W2tleXdvcmRdO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG5cclxuXHJcbiAgICAgIGZ1bmN0aW9uIHJlZ2lzdGVyRGVmYXVsdFR5cGVzKCkge1xyXG4gICAgICAgIGZ1bmN0aW9uIG53cFNpbmdsZWZpbGVVcGxvYWREZWZhdWx0UHJvdmlkZXIobmFtZSwgc2NoZW1hLCBvcHRpb25zKSB7XHJcbiAgICAgICAgICBpZiAoc2NoZW1hLnR5cGUgPT09ICdhcnJheScgJiYgc2NoZW1hLmZvcm1hdCA9PT0gJ3NpbmdsZWZpbGUnKSB7XHJcbiAgICAgICAgICAgIHZhciBmID0gc2NoZW1hRm9ybVByb3ZpZGVyLnN0ZEZvcm1PYmoobmFtZSwgc2NoZW1hLCBvcHRpb25zKTtcclxuICAgICAgICAgICAgZi5rZXkgPSBvcHRpb25zLnBhdGg7XHJcbiAgICAgICAgICAgIGYudHlwZSA9ICdud3BGaWxlVXBsb2FkJztcclxuICAgICAgICAgICAgb3B0aW9ucy5sb29rdXBbc2ZQYXRoUHJvdmlkZXIuc3RyaW5naWZ5KG9wdGlvbnMucGF0aCldID0gZjtcclxuICAgICAgICAgICAgX2FwcGx5RGVmYXVsdFZhbGlkYXRpb25FcnJvck1lc3NhZ2VzKGYsIHNjaGVtYSwgX2RlZmF1bHRTaW5nbGVGaWxlVXBsb2FkVmFsaWRhdGlvbkVycm9yTWVzc2FnZXMpO1xyXG4gICAgICAgICAgICByZXR1cm4gZjtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZ1bmN0aW9uIG53cE11bHRpZmlsZVVwbG9hZERlZmF1bHRQcm92aWRlcihuYW1lLCBzY2hlbWEsIG9wdGlvbnMpIHtcclxuICAgICAgICAgIGlmIChzY2hlbWEudHlwZSA9PT0gJ2FycmF5JyAmJiBzY2hlbWEuZm9ybWF0ID09PSAnbXVsdGlmaWxlJykge1xyXG4gICAgICAgICAgICB2YXIgZiA9IHNjaGVtYUZvcm1Qcm92aWRlci5zdGRGb3JtT2JqKG5hbWUsIHNjaGVtYSwgb3B0aW9ucyk7XHJcbiAgICAgICAgICAgIGYua2V5ID0gb3B0aW9ucy5wYXRoO1xyXG4gICAgICAgICAgICBmLnR5cGUgPSAnbndwRmlsZVVwbG9hZCc7XHJcbiAgICAgICAgICAgIG9wdGlvbnMubG9va3VwW3NmUGF0aFByb3ZpZGVyLnN0cmluZ2lmeShvcHRpb25zLnBhdGgpXSA9IGY7XHJcbiAgICAgICAgICAgIF9hcHBseURlZmF1bHRWYWxpZGF0aW9uRXJyb3JNZXNzYWdlcyhmLCBzY2hlbWEsIF9kZWZhdWx0TXVsdGlGaWxlVXBsb2FkVmFsaWRhdGlvbkVycm9yTWVzc2FnZXMpO1xyXG4gICAgICAgICAgICByZXR1cm4gZjtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNjaGVtYUZvcm1Qcm92aWRlci5kZWZhdWx0cy5hcnJheS51bnNoaWZ0KG53cFNpbmdsZWZpbGVVcGxvYWREZWZhdWx0UHJvdmlkZXIpO1xyXG4gICAgICAgIHNjaGVtYUZvcm1Qcm92aWRlci5kZWZhdWx0cy5hcnJheS51bnNoaWZ0KG53cE11bHRpZmlsZVVwbG9hZERlZmF1bHRQcm92aWRlcik7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIHJlZ2lzdGVyRGVmYXVsdFR5cGVzKCk7XHJcblxyXG4gICAgICBzY2hlbWFGb3JtRGVjb3JhdG9yc1Byb3ZpZGVyLmRlZmluZUFkZE9uKFxyXG4gICAgICAgICdib290c3RyYXBEZWNvcmF0b3InLFxyXG4gICAgICAgICdud3BGaWxlVXBsb2FkJyxcclxuICAgICAgICAnZGlyZWN0aXZlcy9kZWNvcmF0b3JzL2Jvb3RzdHJhcC9ud3AtZmlsZS9zY2hlbWEtZm9ybS1maWxlLmh0bWwnLFxyXG4gICAgICAgIC8vIGRlZmF1bHRzXHJcbiAgICAgICAgc2ZCdWlsZGVyUHJvdmlkZXIuc3RkQnVpbGRlcnNcclxuICAgICAgKTtcclxuICAgIH1cclxuICBdKTtcclxuXHJcbmFuZ3VsYXJcclxuICAubW9kdWxlKCduZ1NjaGVtYUZvcm1GaWxlJywgW1xyXG4gICAgJ25nRmlsZVVwbG9hZCcsXHJcbiAgICAnbmdNZXNzYWdlcydcclxuICBdKVxyXG4gIC5kaXJlY3RpdmUoJ25nU2NoZW1hRmlsZScsIFsnVXBsb2FkJywgJyR0aW1lb3V0JywgJyRxJywgJyRpbnRlcnBvbGF0ZScsICckdHJhbnNsYXRlJywgJ3N1Ym1pc3Npb25TZXJ2aWNlJywgJ2ZpbGVTZXJ2aWNlJywgZnVuY3Rpb24gKFVwbG9hZCwgJHRpbWVvdXQsICRxLCAkaW50ZXJwb2xhdGUsICR0cmFuc2xhdGUsIHN1Ym1pc3Npb25TZXJ2aWNlLCBmaWxlU2VydmljZSkgeyAvLywgJ3N1Ym1pc3Npb25TZXJ2aWNlJywgJ2ZpbGVTZXJ2aWNlJywgc3VibWlzc2lvblNlcnZpY2UsIGZpbGVTZXJ2aWNlXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICByZXN0cmljdDogJ0EnLFxyXG4gICAgICBzY29wZTogdHJ1ZSxcclxuICAgICAgcmVxdWlyZTogJ25nTW9kZWwnLFxyXG4gICAgICBsaW5rOiBmdW5jdGlvbiAoc2NvcGUsIGVsZW1lbnQsIGF0dHJzLCBuZ01vZGVsKSB7XHJcbiAgICAgICAgc2NvcGUudXJsID0gc2NvcGUuZm9ybSAmJiBzY29wZS5mb3JtLmVuZHBvaW50O1xyXG4gICAgICAgIHNjb3BlLmlzU2luZ2xlZmlsZVVwbG9hZCA9IHNjb3BlLmZvcm0gJiYgc2NvcGUuZm9ybS5zY2hlbWEgJiYgc2NvcGUuZm9ybS5zY2hlbWEuZm9ybWF0ID09PSAnc2luZ2xlZmlsZSc7XHJcblxyXG4gICAgICAgIHNjb3BlLmZpbGVTZXJ2aWNlID0gZmlsZVNlcnZpY2U7XHJcblxyXG5cclxuICAgICAgICBzY29wZS5zZWxlY3RGaWxlID0gZnVuY3Rpb24gKGZpbGUsICRpbnZhbGlkRmlsZSkge1xyXG4gICAgICAgICAgc2NvcGUuaW52YWxpZEZpbGUgPSAkaW52YWxpZEZpbGU7XHJcbiAgICAgICAgICBzY29wZS5waWNGaWxlID0gZmlsZTtcclxuICAgICAgICAgIGlmIChmaWxlICYmIGZpbGUgIT0gbnVsbClcclxuICAgICAgICAgICAgc2NvcGUudXBsb2FkRmlsZShmaWxlKTtcclxuICAgICAgICB9O1xyXG4gICAgICAgIHNjb3BlLnNlbGVjdEZpbGVzID0gZnVuY3Rpb24gKGZpbGVzLCAkaW52YWxpZEZpbGVzKSB7XHJcbiAgICAgICAgICBzY29wZS5pbnZhbGlkRmlsZXMgPSAkaW52YWxpZEZpbGVzO1xyXG4gICAgICAgICAgc2NvcGUucGljRmlsZXMgPSBmaWxlcztcclxuICAgICAgICAgIGlmIChmaWxlcyAmJiBmaWxlcyAhPSBudWxsICYmIGZpbGVzLmxlbmd0aCA+IDApXHJcbiAgICAgICAgICAgIHNjb3BlLnVwbG9hZEZpbGVzKGZpbGVzKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBzY29wZS51cGxvYWRGaWxlID0gZnVuY3Rpb24gKGZpbGUpIHtcclxuICAgICAgICAgIGZpbGUgJiYgZG9VcGxvYWQoZmlsZSk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgc2NvcGUudXBsb2FkRmlsZXMgPSBmdW5jdGlvbiAoZmlsZXMpIHtcclxuICAgICAgICAgIGZpbGVzLmxlbmd0aCAmJiBhbmd1bGFyLmZvckVhY2goZmlsZXMsIGZ1bmN0aW9uIChmaWxlKSB7XHJcbiAgICAgICAgICAgIGRvVXBsb2FkKGZpbGUpO1xyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfTtcclxuXHJcblxyXG5cclxuXHJcbiAgICAgICAgZnVuY3Rpb24gX21lcmdlRGF0YVRvTmdNb2RlbFZhbHVlKG1vZGVsKSB7XHJcbiAgICAgICAgICBpZiAoc2NvcGUuaXNTaW5nbGVmaWxlVXBsb2FkKSB7XHJcbiAgICAgICAgICAgIGlmIChuZ01vZGVsLiRtb2RlbFZhbHVlKSB7XHJcbiAgICAgICAgICAgICAgbmdNb2RlbC4kc2V0Vmlld1ZhbHVlKGFuZ3VsYXIubWVyZ2UobmdNb2RlbC4kbW9kZWxWYWx1ZSwgbW9kZWwpKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICBuZ01vZGVsLiRzZXRWaWV3VmFsdWUobW9kZWwpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBpZiAobmdNb2RlbC4kbW9kZWxWYWx1ZSkge1xyXG4gICAgICAgICAgICAgIG5nTW9kZWwuJHNldFZpZXdWYWx1ZShuZ01vZGVsLiRtb2RlbFZhbHVlLmNvbmNhdChtb2RlbCkpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgIG5nTW9kZWwuJHNldFZpZXdWYWx1ZShbbW9kZWxdKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgbmdNb2RlbC4kY29tbWl0Vmlld1ZhbHVlKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB2YXIgZmlsZVJlc3VsdCA9IG51bGw7XHJcblxyXG4gICAgICAgIGZ1bmN0aW9uIGRvVXBsb2FkKGZpbGUpIHtcclxuICAgICAgICAgIGlmIChmaWxlICYmICFmaWxlLiRlcnJvciAmJiBzY29wZS51cmwpIHtcclxuICAgICAgICAgICAgdmFyIG9wdGlvbnMgPSB7XHJcbiAgICAgICAgICAgICAgdXJsOiBzY29wZS51cmwsXHJcbiAgICAgICAgICAgICAgZGF0YToge1xyXG4gICAgICAgICAgICAgICAgZmlsZToge30sXHJcbiAgICAgICAgICAgICAgICBldmVudElkOiB7fSxcclxuICAgICAgICAgICAgICAgIHVzZXJJZDoge30sXHJcbiAgICAgICAgICAgICAgICBwcmlvcml0eTogc2NvcGUuZm9ybS5zY2hlbWEucHJpb3JpdHlcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBvcHRpb25zLmRhdGFbc2NvcGUuZm9ybS5maWxlTmFtZSB8fCAnZmlsZSddID0gZmlsZTtcclxuICAgICAgICAgICAgb3B0aW9ucy5kYXRhWydldmVudElkJ10gPSBzdWJtaXNzaW9uU2VydmljZS5nZXRSZXBvcnRUeXBlKCkucmVwb3J0VHlwZS52YWx1ZTtcclxuICAgICAgICAgICAgb3B0aW9ucy5kYXRhWyd1c2VySWQnXSA9IHN1Ym1pc3Npb25TZXJ2aWNlLmdldFVzZXJJZCgpO1xyXG4gICAgICAgICAgICBmaWxlLnVwbG9hZCA9IFVwbG9hZC51cGxvYWQob3B0aW9ucyk7XHJcblxyXG4gICAgICAgICAgICBmaWxlLnVwbG9hZC50aGVuKGZ1bmN0aW9uIChyZXNwb25zZSkge1xyXG4gICAgICAgICAgICAgICR0aW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIGZpbGUucmVzdWx0ID0gcmVzcG9uc2UuZGF0YS5tZXNzYWdlO1xyXG4gICAgICAgICAgICAgICAgZmlsZS51dWlkID0gcmVzcG9uc2UuZGF0YS5maWxlWzBdLnV1aWQ7XHJcbiAgICAgICAgICAgICAgICBmaWxlLnVwbG9hZENvbXBsZXRlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICBmaWxlLnByb2dyZXNzID0gMTAwO1xyXG4gICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgIC8vZmlsZVJlc3VsdCA9IHJlc3BvbnNlLmRhdGEuZmlsZTtcclxuICAgICAgICAgICAgICBfbWVyZ2VEYXRhVG9OZ01vZGVsVmFsdWUocmVzcG9uc2UuZGF0YS5maWxlWzBdKTtcclxuICAgICAgICAgICAgfSwgZnVuY3Rpb24gKHJlc3BvbnNlKSB7XHJcbiAgICAgICAgICAgICAgaWYgKHJlc3BvbnNlLnN0YXR1cyA+IDApIHtcclxuICAgICAgICAgICAgICAgIGZpbGUuZXJyb3JNc2cgPSByZXNwb25zZS5zdGF0dXMgKyAnOiAnICsgcmVzcG9uc2UuZGF0YS5tZXNzYWdlO1xyXG4gICAgICAgICAgICAgIH0gZWxzZSBpZiAocmVzcG9uc2Uuc3RhdHVzID09IC0xKSB7XHJcbiAgICAgICAgICAgICAgICBmaWxlLmVycm9yTXNnID0gXCJFcnJvcjogdHJvdWJsZSBjb25uZWN0aW5nIHRvIHRoZSBzZXJ2ZXIsIHBsZWFzZSB2ZXJpZnkgeW91IGhhdmUgaW50ZXJuZXQgYWNjZXNzLlwiO1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIC8vIC50aGVuKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgLy8gICBpZiAoZmlsZVJlc3VsdCAmJiBmaWxlUmVzdWx0ICE9IG51bGwgJiYgZmlsZVJlc3VsdC5maWxlKVxyXG4gICAgICAgICAgICAvLyAgICAgZmlsZVNlcnZpY2Uuc2V0RmlsZShmaWxlUmVzdWx0LmZpbGVbMF0pO1xyXG4gICAgICAgICAgICAvLyB9KTtcclxuXHJcbiAgICAgICAgICAgIGZpbGUudXBsb2FkLnByb2dyZXNzKGZ1bmN0aW9uIChldnQpIHtcclxuICAgICAgICAgICAgICBmaWxlLnByb2dyZXNzID0gTWF0aC5taW4oMTAwLCBwYXJzZUludCgxMDAuMCAqXHJcbiAgICAgICAgICAgICAgICBldnQubG9hZGVkIC8gZXZ0LnRvdGFsKSk7XHJcbiAgICAgICAgICAgICAgaWYgKGZpbGUucHJvZ3Jlc3MgPT0gMTAwICYmICFmaWxlLnVwbG9hZENvbXBsZXRlZCkge1xyXG4gICAgICAgICAgICAgICAgLy9iZWNhdXNlIHdlIG5lZWQgdGhlIHJlc3BvbnNlIHRvIHJldHVybiwgd2UgYXJlbid0IHRydWVseSBhdCAxMDAlIGNvbXBsZXRlLCB1bnRpbCB0aGUgcmVwb25zZSBpcyByZXR1cm5lZC4gbmctZmlsZS11cGxvYWQgc2F5cyB3ZSdyZSBhdCAxMDAlIHdoZW4gdGhlIGZpbGUgaXMgc2VudCB0byB0aGUgc2VydmVyLlxyXG4gICAgICAgICAgICAgICAgZmlsZS5wcm9ncmVzcyA9IDk5O1xyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmdW5jdGlvbiBfY2xlYXJFcnJvck1zZygpIHtcclxuICAgICAgICAgIGRlbGV0ZSBzY29wZS5lcnJvck1zZztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZ1bmN0aW9uIF9yZXNldEZpZWxkTmdNb2RlbChpc0FycmF5KSB7XHJcbiAgICAgICAgICBpZiAoaXNBcnJheSkge1xyXG4gICAgICAgICAgICBuZ01vZGVsLiRzZXRWaWV3VmFsdWUoW10pO1xyXG4gICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgbmdNb2RlbC4kc2V0Vmlld1ZhbHVlKCk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBuZ01vZGVsLiRjb21taXRWaWV3VmFsdWUoKTtcclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICAvLyBUaGlzIGlzIHRoZSBuZ01vZGVsIG9mIHRoZSBcImZpbGVcIiBpbnB1dCwgaW5zdGVhZCBvZiB0aGUgbmdNb2RlbCBvZiB0aGUgd2hvbGUgZm9ybVxyXG4gICAgICAgIGZ1bmN0aW9uIF9yZXNldEZpbGVOZ01vZGVsKCkge1xyXG4gICAgICAgICAgdmFyIGZpbGVOZ01vZGVsID0gc2NvcGUudXBsb2FkRm9ybS5maWxlO1xyXG4gICAgICAgICAgZmlsZU5nTW9kZWwuJHNldFZpZXdWYWx1ZSgpO1xyXG4gICAgICAgICAgZmlsZU5nTW9kZWwuJGNvbW1pdFZpZXdWYWx1ZSgpO1xyXG4gICAgICAgICAgZGVsZXRlIHNjb3BlLnBpY0ZpbGU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvLyBUaGlzIGlzIHRoZSBuZ01vZGVsIG9mIHRoZSBcImZpbGVcIiBpbnB1dCwgaW5zdGVhZCBvZiB0aGUgbmdNb2RlbCBvZiB0aGUgd2hvbGUgZm9ybVxyXG4gICAgICAgIGZ1bmN0aW9uIF9yZXNldEZpbGVzTmdNb2RlbChpbmRleCkge1xyXG4gICAgICAgICAgdmFyIGZpbGVOZ01vZGVsID0gc2NvcGUudXBsb2FkRm9ybS5maWxlcztcclxuICAgICAgICAgIGlmIChzY29wZS5waWNGaWxlcy5sZW5ndGggPT09IDEpIHtcclxuICAgICAgICAgICAgZmlsZU5nTW9kZWwuJHNldFZpZXdWYWx1ZSgpO1xyXG4gICAgICAgICAgICBkZWxldGUgc2NvcGUucGljRmlsZXM7XHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBzY29wZS5waWNGaWxlcy5zcGxpY2UoaW5kZXgsIDEpO1xyXG4gICAgICAgICAgICBmaWxlTmdNb2RlbC4kc2V0Vmlld1ZhbHVlKHNjb3BlLnBpY0ZpbGVzKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGZpbGVOZ01vZGVsLiRjb21taXRWaWV3VmFsdWUoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNjb3BlLnJlbW92ZUludmFsaWRGaWxlID0gZnVuY3Rpb24gKGludmFsaWRGaWxlLCBpbmRleCkge1xyXG4gICAgICAgICAgaWYgKHNjb3BlLmlzU2luZ2xlZmlsZVVwbG9hZCkge1xyXG4gICAgICAgICAgICBkZWxldGUgc2NvcGUuaW52YWxpZEZpbGU7XHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBzY29wZS5pbnZhbGlkRmlsZXMuc3BsaWNlKGluZGV4LCAxKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBzY29wZS5yZW1vdmVGaWxlID0gZnVuY3Rpb24gKGZpbGUsIGluZGV4KSB7XHJcbiAgICAgICAgICBpZiAoc2NvcGUuaXNTaW5nbGVmaWxlVXBsb2FkKSB7XHJcbiAgICAgICAgICAgIGlmIChmaWxlICYmIGZpbGUudXVpZClcclxuICAgICAgICAgICAgICBzY29wZS5maWxlU2VydmljZS5kZWxldGVGaWxlKGZpbGUudXVpZCk7XHJcblxyXG4gICAgICAgICAgICBfY2xlYXJFcnJvck1zZygpO1xyXG4gICAgICAgICAgICBfcmVzZXRGaWVsZE5nTW9kZWwoZmFsc2UpO1xyXG4gICAgICAgICAgICBfcmVzZXRGaWxlTmdNb2RlbCgpO1xyXG5cclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGlmIChmaWxlICYmIGZpbGUudXVpZClcclxuICAgICAgICAgICAgICBzY29wZS5maWxlU2VydmljZS5kZWxldGVGaWxlKGZpbGUudXVpZCk7XHJcblxyXG4gICAgICAgICAgICBfY2xlYXJFcnJvck1zZygpO1xyXG4gICAgICAgICAgICBfcmVzZXRGaWVsZE5nTW9kZWwodHJ1ZSk7XHJcbiAgICAgICAgICAgIF9yZXNldEZpbGVzTmdNb2RlbChpbmRleCk7XHJcblxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHNjb3BlLnZhbGlkYXRlRmllbGQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICBpZiAoc2NvcGUudXBsb2FkRm9ybS5maWxlICYmIHNjb3BlLnVwbG9hZEZvcm0uZmlsZS4kdmFsaWQgJiYgc2NvcGUucGljRmlsZSAmJiAhc2NvcGUucGljRmlsZS4kZXJyb3IpIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ3NpbmdsZWZpbGUtZm9ybSBpcyB2YWxpZCcpO1xyXG4gICAgICAgICAgfSBlbHNlIGlmIChzY29wZS51cGxvYWRGb3JtLmZpbGVzICYmIHNjb3BlLnVwbG9hZEZvcm0uZmlsZXMuJHZhbGlkICYmIHNjb3BlLnBpY0ZpbGVzICYmICFzY29wZS5waWNGaWxlcy4kZXJyb3IpIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ211bHRpZmlsZS1mb3JtIGlzICB2YWxpZCcpO1xyXG4gICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ3NpbmdsZS0gYW5kIG11bHRpZmlsZS1mb3JtIGFyZSBpbnZhbGlkJyk7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBzY29wZS5zdWJtaXQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICBpZiAoc2NvcGUudXBsb2FkRm9ybS5maWxlICYmIHNjb3BlLnVwbG9hZEZvcm0uZmlsZS4kdmFsaWQgJiYgc2NvcGUucGljRmlsZSAmJiAhc2NvcGUucGljRmlsZS4kZXJyb3IpIHtcclxuICAgICAgICAgICAgc2NvcGUudXBsb2FkRmlsZShzY29wZS5waWNGaWxlKTtcclxuICAgICAgICAgIH0gZWxzZSBpZiAoc2NvcGUudXBsb2FkRm9ybS5maWxlcyAmJiBzY29wZS51cGxvYWRGb3JtLmZpbGVzLiR2YWxpZCAmJiBzY29wZS5waWNGaWxlcyAmJiAhc2NvcGUucGljRmlsZXMuJGVycm9yKSB7XHJcbiAgICAgICAgICAgIHNjb3BlLnVwbG9hZEZpbGVzKHNjb3BlLnBpY0ZpbGVzKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBzY29wZS4kb24oJ3NjaGVtYUZvcm1WYWxpZGF0ZScsIHNjb3BlLnZhbGlkYXRlRmllbGQpO1xyXG4gICAgICAgIHNjb3BlLiRvbignc2NoZW1hRm9ybUZpbGVVcGxvYWRTdWJtaXQnLCBzY29wZS5zdWJtaXQpO1xyXG5cclxuICAgICAgICBzY29wZS5pbnRlcnBWYWxpZGF0aW9uTWVzc2FnZSA9IGZ1bmN0aW9uIGludGVycFZhbGlkYXRpb25NZXNzYWdlKGVycm9yVHlwZSwgaW52YWxpZEZpbGUpIHtcclxuICAgICAgICAgIGlmICghaW52YWxpZEZpbGUpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIHZhciBlcnJvciA9IGVycm9yVHlwZTsgLy9pbnZhbGlkRmlsZS4kZXJyb3I7IC8vIGUuZy4sICdtYXhTaXplJ1xyXG4gICAgICAgICAgdmFyIGZvcm0gPSBzY29wZS5mb3JtO1xyXG4gICAgICAgICAgdmFyIHZhbGlkYXRpb25NZXNzYWdlID0gZm9ybSAmJiBmb3JtLnNjaGVtYSA/IGZvcm0udmFsaWRhdGlvbk1lc3NhZ2UgOiBmb3JtLnNjaGVtYS52YWxpZGF0aW9uTWVzc2FnZSA/IGZvcm0uc2NoZW1hLnZhbGlkYXRpb25NZXNzYWdlIDogdW5kZWZpbmVkO1xyXG4gICAgICAgICAgdmFyIG1lc3NhZ2U7XHJcbiAgICAgICAgICBpZiAoYW5ndWxhci5pc1N0cmluZyh2YWxpZGF0aW9uTWVzc2FnZSkpIHtcclxuICAgICAgICAgICAgbWVzc2FnZSA9IHZhbGlkYXRpb25NZXNzYWdlO1xyXG4gICAgICAgICAgfSBlbHNlIGlmIChhbmd1bGFyLmlzT2JqZWN0KHZhbGlkYXRpb25NZXNzYWdlKSkge1xyXG4gICAgICAgICAgICBtZXNzYWdlID0gdmFsaWRhdGlvbk1lc3NhZ2VbZXJyb3JdO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIGlmICghbWVzc2FnZSkge1xyXG4gICAgICAgICAgICByZXR1cm4gZXJyb3I7XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgdmFyIGNvbnRleHQgPSB7XHJcbiAgICAgICAgICAgIGVycm9yOiBlcnJvcixcclxuICAgICAgICAgICAgZmlsZTogaW52YWxpZEZpbGUsXHJcbiAgICAgICAgICAgIGZvcm06IGZvcm0sXHJcbiAgICAgICAgICAgIHNjaGVtYTogZm9ybS5zY2hlbWEsXHJcbiAgICAgICAgICAgIHRpdGxlOiBmb3JtLnRpdGxlIHx8IChmb3JtLnNjaGVtYSAmJiBmb3JtLnNjaGVtYS50aXRsZSlcclxuICAgICAgICAgIH07XHJcbiAgICAgICAgICB2YXIgaW50ZXJwb2xhdGVkTWVzc2FnZSA9ICRpbnRlcnBvbGF0ZShtZXNzYWdlKShjb250ZXh0KTtcclxuXHJcbiAgICAgICAgICByZXR1cm4gJHRyYW5zbGF0ZS5pbnN0YW50KGludGVycG9sYXRlZE1lc3NhZ2UpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICB9XHJcbiAgICB9O1xyXG4gIH1dKTsiLG51bGxdfQ==
