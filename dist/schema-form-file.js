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
          if (schema.type === 'object' && schema.format === 'singlefile') {
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
angular.module("schemaForm").run(["$templateCache", function($templateCache) {$templateCache.put("directives/decorators/bootstrap/nwp-file/nwp-file.html","<ng-form class=\"file-upload mb-lg\" ng-schema-file ng-model=\"$$value$$\" name=\"uploadForm\">\r\n    <label ng-show=\"form.title && form.notitle !== true\" class=\"control-label\" for=\"fileInputButton\" ng-class=\"{\'sr-only\': !showTitle(), \'text-danger\': uploadForm.$error.required && !uploadForm.$pristine}\">\r\n        {{ form.title }}<i ng-show=\"form.required\">&nbsp;*</i>\r\n    </label>\r\n    <div ng-show=\"picFile\">\r\n        <div ng-include=\"\'uploadProcess.html\'\" class=\"mb\"></div>\r\n    </div>\r\n    <ul ng-show=\"picFiles && picFiles.length\" class=\"list-group\">\r\n        <li class=\"list-group-item\" ng-repeat=\"picFile in picFiles\">\r\n            <div ng-include=\"\'uploadProcess.html\'\"></div>\r\n        </li>\r\n    </ul>\r\n    <div class=\"well well-sm bg-white mb\" ng-class=\"{\'has-error border-danger\': (uploadForm.$error.required && !uploadForm.$pristine) || (hasError() && errorMessage(schemaError()))}\">\r\n        <small class=\"text-muted\" ng-show=\"form.description\" ng-bind-html=\"form.description\"></small>\r\n        <div ng-if=\"isSinglefileUpload\" ng-include=\"\'singleFileUpload.html\'\"></div>\r\n        <div ng-if=\"!isSinglefileUpload\" ng-include=\"\'multiFileUpload.html\'\"></div>\r\n        <div class=\"help-block mb0\" ng-show=\"uploadForm.$error.required && !uploadForm.$pristine\">{{ \'modules.attribute.fields.required.caption\' | translate }}</div>\r\n        <div class=\"help-block mb0\" ng-show=\"(hasError() && errorMessage(schemaError()))\" ng-bind-html=\"(hasError() && errorMessage(schemaError()))\"></div>\r\n    </div>\r\n</ng-form>\r\n<script type=\'text/ng-template\' id=\"uploadProcess.html\">\r\n    <div class=\"row mb\">\r\n        <div class=\"col-sm-4 mb-sm\">\r\n            <label title=\"{{ form.i18n.preview? form.i18n.preview : (\'modules.upload.field.preview\' | translate)}}\" class=\"text-info\">{{ form.i18n.preview? form.i18n.preview : (\'modules.upload.field.preview\' | translate)}}</label>\r\n            <img ngf-src=\"picFile\" class=\"img-thumbnail img-responsive\">\r\n            <div class=\"img-placeholder\" ng-class=\"{\'show\': picFile.$invalid && !picFile.blobUrl, \'hide\': !picFile || picFile.blobUrl}\">No preview available\r\n            </div>\r\n        </div>\r\n        <div class=\"col-sm-4 mb-sm\">\r\n            <label title=\"{{ form.i18n.filename ? form.i18n.filename : (\'modules.upload.field.filename\' | translate)  }}\" class=\"text-info\">{{ form.i18n.filename ? form.i18n.filename : (\'modules.upload.field.filename\' | translate)}}</label>\r\n            <div class=\"filename\" title=\"{{ picFile.name }}\">{{ picFile.name }}</div>\r\n        </div>\r\n        <div class=\"col-sm-4 mb-sm\">\r\n            <label title=\"{{ form.i18n.progress ? form.i18n.progress : (\'modules.upload.field.progress\' | translate)  }}\" class=\"text-info\">{{ form.i18n.progress ? form.i18n.progress : (\'modules.upload.field.progress\' | translate) }}</label>\r\n            <div class=\"progress\">\r\n                <div class=\"progress-bar progress-bar-striped\" role=\"progressbar\" ng-class=\"{\'progress-bar-success\': picFile.progress == 100}\" ng-style=\"{width: picFile.progress + \'%\'}\">\r\n                    {{ picFile.progress }} %\r\n                </div>\r\n            </div>\r\n            <button class=\"btn btn-primary btn-sm\" type=\"button\" ng-click=\"uploadFile(picFile)\" ng-disabled=\"!picFile || picFile.$error\">{{ form.i18n.upload ? form.i18n.upload : (\'buttons.upload\' | translate) }}\r\n            </button>\r\n        </div>\r\n    </div>\r\n    <div ng-messages=\"uploadForm.$error\" ng-messages-multiple=\"\">\r\n        <div class=\"text-danger errorMsg\" ng-message=\"maxSize\">{{ form[picFile.$error].validationMessage | translate }} <strong>{{picFile.$errorParam}}</strong>. ({{ form[picFile.$error].validationMessage2 | translate }} <strong>{{picFile.size / 1000000|number:1}}MB</strong>)</div>\r\n        <div class=\"text-danger errorMsg\" ng-message=\"pattern\">{{ form[picFile.$error].validationMessage | translate }} <strong>{{picFile.$errorParam}}</strong></div>\r\n        <div class=\"text-danger errorMsg\" ng-message=\"maxItems\">{{ form[picFile.$error].validationMessage | translate }} <strong>{{picFile.$errorParam}}</strong></div>\r\n        <div class=\"text-danger errorMsg\" ng-message=\"minItems\">{{ form[picFile.$error].validationMessage | translate }} <strong>{{picFile.$errorParam}}</strong></div>\r\n        <div class=\"text-danger errorMsg\" ng-show=\"errorMsg\">{{errorMsg}}</div>\r\n    </div>\r\n</script>\r\n<script type=\'text/ng-template\' id=\"singleFileUpload.html\">\r\n    <div ngf-drop=\"selectFile(picFile)\" ngf-select=\"selectFile(picFile)\" type=\"file\" ngf-multiple=\"false\" ng-model=\"picFile\" name=\"file\" ng-attr-ngf-pattern=\"{{form.schema.pattern && form.schema.pattern.mimeType ? form.schema.pattern.mimeType : undefined }}\" ng-attr-ngf-max-size=\"{{form.schema.maxSize && form.schema.maxSize.maximum ? form.schema.maxSize.maximum : undefined }}\" ng-required=\"form.required\" accept=\"{{form.schema.pattern && form.schema.pattern.mimeType}}\" ng-model-options=\"form.ngModelOptions\" ngf-drag-over-class=\"dragover\" class=\"drop-box dragAndDropDescription\">\r\n        <p class=\"text-center\">{{form.i18n.dragorclick ? form.i18n.dragorclick:(\'modules.upload.descriptionSinglefile\' | translate)}}</p>\r\n    </div>\r\n    <div ngf-no-file-drop>{{ \'modules.upload.dndNotSupported\' | translate}}</div>\r\n    <button ngf-select=\"selectFile(picFile)\" type=\"file\" ngf-multiple=\"false\" ng-model=\"picFile\" name=\"file\" ng-attr-ngf-pattern=\"{{form.schema.pattern && form.schema.pattern.mimeType ? form.schema.pattern.mimeType : undefined }}\" ng-attr-ngf-max-size=\"{{form.schema.maxSize && form.schema.maxSize.maximum ? form.schema.maxSize.maximum : undefined }}\" ng-required=\"form.required\" accept=\"{{form.schema.pattern && form.schema.pattern.mimeType}}\" ng-model-options=\"form.ngModelOptions\" id=\"fileInputButton\" class=\"btn btn-primary btn-block {{form.htmlClass}} mt-lg mb\">\r\n        <fa fw=\"fw\" name=\"upload\" class=\"mr-sm\"></fa>\r\n        {{form.i18n.add ? form.i18n.add : (\'buttons.add\' | translate)}}\r\n    </button>\r\n</script>\r\n<script type=\'text/ng-template\' id=\"multiFileUpload.html\">\r\n    <div ngf-drop=\"selectFiles(picFiles)\" ngf-select=\"selectFiles(picFiles)\" type=\"file\" ngf-multiple=\"true\" ng-model=\"picFiles\" name=\"files\" ng-attr-ngf-pattern=\"{{form.schema.pattern && form.schema.pattern.mimeType ? form.schema.pattern.mimeType : undefined }}\" ng-attr-ngf-max-size=\"{{form.schema.maxSize && form.schema.maxSize.maximum ? form.schema.maxSize.maximum : undefined }}\" ng-required=\"form.required\" accept=\"{{form.schema.pattern && form.schema.pattern.mimeType}}\" ng-model-options=\"form.ngModelOptions\" ngf-drag-over-class=\"dragover\" class=\"drop-box dragAndDropDescription\">\r\n        <p class=\"text-center\">{{form.i18n.dragorclick ? form.i18n.dragorclick:(\'modules.upload.descriptionMultifile\' | translate)}}</p>\r\n    </div>\r\n    <div ngf-no-file-drop>{{ \'modules.upload.dndNotSupported\' | translate}}</div>\r\n    <button ngf-select=\"selectFiles(picFiles)\" type=\"file\" ngf-multiple=\"true\" multiple ng-model=\"picFiles\" name=\"files\" accept=\"{{form.schema.pattern && form.schema.pattern.mimeType}}\" ng-attr-ngf-pattern=\"{{form.schema.pattern && form.schema.pattern.mimeType ? form.schema.pattern.mimeType : undefined }}\" ng-attr-ngf-max-size=\"{{form.schema.maxSize && form.schema.maxSize.maximum ? form.schema.maxSize.maximum : undefined }}\" ng-required=\"form.required\" ng-model-options=\"form.ngModelOptions\" id=\"fileInputButton\" class=\"btn btn-primary btn-block {{form.htmlClass}} mt-lg mb\">\r\n        <fa fw=\"fw\" name=\"upload\" class=\"mr-sm\"></fa>\r\n        {{form.i18n.add ? form.i18n.add : (\'buttons.add\' | translate)}}\r\n    </button>\r\n</script>");
$templateCache.put("directives/decorators/bootstrap/nwp-file/schema-form-file.html","<ng-form class=\"file-upload mb-lg\" ng-schema-file schema-validate=\"form\" sf-field-model=\"replaceAll\" ng-model=\"$$value$$\"\r\n  name=\"uploadForm\">\r\n  <!--sf-field-model=\"replaceAll\"schema-validate=\"form\" sf-field-model=\"replaceAll\"-->\r\n  <label ng-show=\"form.title && form.notitle !== true\" class=\"control-label\" for=\"fileInputButton\" ng-class=\"{\'sr-only\': !showTitle(), \'text-danger\': uploadForm.$error.required && !uploadForm.$pristine}\">\r\n    {{::form.title}}\r\n    <i ng-show=\"form.required\">&nbsp;*</i>\r\n  </label>\r\n\r\n  <div ng-show=\"picFile && !picFile.$error\" class=\"well well-sm bg-white mb\" ng-class=\"{\'has-error border-danger\': (uploadForm.$error.required && !uploadForm.$pristine) || (hasError() && errorMessage(schemaError()))}\">\r\n    <ul class=\"list-group\">\r\n      <li class=\"list-group-item\">\r\n        <div ng-include=\"\'directives/decorators/bootstrap/nwp-file/schema-form-file.template.progress.html\'\" ></div>\r\n        <span ng-show=\"picFile.errorMsg\" class=\"help-block has-error mb0\">{{ picFile.errorMsg }}</span>\r\n      </li>\r\n    </ul>    \r\n    <!-- <div ng-include=\"\'directives/decorators/bootstrap/nwp-file/schema-form-file.template.errors.html\'\" class=\"mb\"></div> -->\r\n    <span class=\"help-block\" sf-message=\"form.description\"></span>\r\n  </div>\r\n\r\n  <div ng-show=\"invalidFile\" class=\"well well-sm mb\">\r\n    <label title=\"Invalid Files\" style=\"color:#a94442\" class=\"text-info\">Invalid File</label>\r\n\r\n    <div ng-class=\"{\'has-error border-danger\': (uploadForm.$error.required && !uploadForm.$pristine) || (hasError() && errorMessage(schemaError()))}\">\r\n\r\n      <ul class=\"list-group\" ng-show=\"invalidFile\">\r\n        <li class=\"list-group-item\" style=\"border-color:#a94442;display:block;height: auto;padding:0px;\">\r\n          <!--ng-repeat=\"invalidFile in invalidFiles\"-->\r\n\r\n          <div class=\"row\">\r\n            <span class=\"col-xs-5 col-sm-5 col-md-5\" title=\"{{invalidFile.name}}\"> {{invalidFile.name}} </span>\r\n            <div class=\"col-xs-6 col-sm-6 text-danger errorMsg col-md-6\" ng-include=\"\'directives/decorators/bootstrap/nwp-file/schema-form-file.template.errors.html\'\"></div>\r\n            <div class=\"col-xs-1 col-sm-1 col-md-1\">\r\n                <button class=\"btn btn-xs btn-danger\" type=\"button\" ng-click=\"removeInvalidFile(invalidFile)\">\r\n                    <span class=\"glyphicon glyphicon-remove\"></span>\r\n                </button></div>\r\n          </div>\r\n        </li>\r\n      </ul>\r\n    </div>\r\n  </div>\r\n\r\n\r\n\r\n  <ul ng-show=\"picFiles && picFiles.length\" class=\"list-group\">\r\n    <li class=\"list-group-item\" ng-repeat=\"picFile in picFiles\">\r\n      <div ng-include=\"\'directives/decorators/bootstrap/nwp-file/schema-form-file.template.progress.html\'\"></div>\r\n      <span ng-show=\"picFile.errorMsg\" class=\"help-block has-error mb0\">{{ picFile.errorMsg }}</span>\r\n      <!-- <div ng-include=\"\'directives/decorators/bootstrap/nwp-file/schema-form-file.template.errors.html\'\" class=\"mb\"></div> -->\r\n    </li>\r\n  </ul>\r\n\r\n  <div ng-show=\"(invalidFiles && invalidFiles.length)\" class=\"well well-sm mb\">\r\n      <label title=\"Invalid Files\" style=\"color:#a94442\" class=\"text-info\">Invalid Files</label>\r\n  \r\n      <div ng-show=\"(invalidFiles && invalidFiles.length)\" ng-class=\"{\'has-error border-danger\': (uploadForm.$error.required && !uploadForm.$pristine) || (hasError() && errorMessage(schemaError()))}\">\r\n  \r\n        <ul class=\"list-group\" ng-show=\"(invalidFiles && invalidFiles.length)\">\r\n          <li class=\"list-group-item\" style=\"border-color:#a94442;display:block;height: auto;padding:0px;\" ng-repeat=\"invalidFile in invalidFiles\">\r\n            <!---->\r\n  \r\n            <div class=\"row\">\r\n              <span class=\"col-xs-5 col-sm-5 col-md-5\" title=\"{{invalidFile.name}}\"> {{invalidFile.name}} </span>\r\n              <div class=\"col-xs-6 col-sm-6 text-danger errorMsg col-md-6\" ng-include=\"\'directives/decorators/bootstrap/nwp-file/schema-form-file.template.errors.html\'\"></div>\r\n              <div class=\"col-xs-1 col-sm-1 col-md-1\">\r\n                  <button class=\"btn btn-xs btn-danger\" type=\"button\" ng-click=\"removeInvalidFile(invalidFile, $index)\">\r\n                      <span class=\"glyphicon glyphicon-remove\"></span>\r\n                  </button></div>\r\n            </div>\r\n          </li>\r\n        </ul>\r\n      </div>\r\n    </div>\r\n\r\n  <div ng-show=\"(isSinglefileUpload && !picFile) || (!isSinglefileUpload && (!picFiles || !picFiles.length))\" class=\"well well-sm bg-white mb\"\r\n    ng-class=\"{\'has-error border-danger\': (uploadForm.$error.required && !uploadForm.$pristine) || (hasError() && errorMessage(schemaError()))}\">\r\n    <small class=\"text-muted\" ng-show=\"form.description\" ng-bind-html=\"form.description\"></small>\r\n    <div ng-if=\"isSinglefileUpload\" ng-include=\"\'directives/decorators/bootstrap/nwp-file/schema-form-file.template.single.html\'\"></div>\r\n    <div ng-if=\"!isSinglefileUpload\" ng-include=\"\'directives/decorators/bootstrap/nwp-file/schema-form-file.template.multiple.html\'\"></div>\r\n    <div class=\"help-block mb0\" ng-show=\"uploadForm.$error.required && !uploadForm.$pristine\">{{ \'modules.attribute.fields.required.caption\' | translate }}</div>\r\n    <span ng-show=\"errorMsg\" class=\"help-block text-danger mb0\">Error: {{ errorMsg }}</span>\r\n    <span class=\"help-block\" sf-message=\"form.description\"></span>\r\n  </div>\r\n</ng-form>");
$templateCache.put("directives/decorators/bootstrap/nwp-file/schema-form-file.template.errors.html","<div ng-messages=\"uploadForm.$error\" ng-messages-multiple=\"\">\r\n  <div class=\"text-danger errorMsg\" ng-message=\"pattern\">{{ interpValidationMessage(\'pattern\', invalidFile)  }}</div>\r\n  <div class=\"text-danger errorMsg\" ng-message=\"maxSize\">{{ interpValidationMessage(\'maxSize\', invalidFile) }}</div>\r\n  <div class=\"text-danger errorMsg\" ng-message=\"maxItems\">{{ interpValidationMessage(\'maxItems\', invalidFile) }}</div>\r\n  <div class=\"text-danger errorMsg\" ng-message=\"minItems\">{{ interpValidationMessage(\'minItems\', invalidFile)}}</div>\r\n  <div class=\"text-danger errorMsg\" ng-show=\"errorMsg\">Error: {{ errorMsg }}</div>\r\n</div>");
$templateCache.put("directives/decorators/bootstrap/nwp-file/schema-form-file.template.multiple.html","<div ngf-drop=\"selectFiles(picFiles, $invalidFiles)\" ngf-select=\"selectFiles(picFiles, $invalidFiles)\" type=\"file\" ngf-multiple=\"true\"\r\n    ng-model=\"picFiles\" name=\"files\"\r\n    ng-attr-ngf-pattern=\"{{form.schema.pattern && form.schema.pattern.mimeType ? form.schema.pattern.mimeType : undefined }}\"\r\n    ng-attr-ngf-max-size=\"{{form.schema.maxSize && form.schema.maxSize.maximum ? form.schema.maxSize.maximum : undefined }}\"\r\n    ng-required=\"form.required\"\r\n    accept=\"{{::form.schema.pattern.mimeType}}\"\r\n    ng-model-options=\"form.ngModelOptions\" ngf-drag-over-class=\"dragover\" class=\"drop-box dragAndDropDescription\">\r\n  <p class=\"text-center\">{{ \'modules.upload.descriptionMultifile\' | translate }}</p>\r\n</div>\r\n<div ngf-no-file-drop>{{ \'modules.upload.dndNotSupported\' | translate}}</div>");
$templateCache.put("directives/decorators/bootstrap/nwp-file/schema-form-file.template.progress.html","<div class=\"row mb\">\r\n    <!---->\r\n    <div class=\"col-xs-1 mb-sm\">\r\n        <!---->\r\n        <label title=\"Result\" class=\"text-info\">&nbsp;</label>\r\n        <div class=\"img-placeholder\">\r\n            <span class=\"fa fa-2x\" aria-hidden=\"true\" ng-class=\"{\'fa-check-circle-o text-success show\': picFile.result && picFile.progress == 100,\r\n                        \'fa-exclamation-circle show text-danger\': picFile.errorMsg,\r\n                        \'fa-refresh fa-spin fa-fw text-primary show\': (picFile.progress >= 0 && picFile.progress < 100) && !picFile.errorMsg}\"\r\n                uib-tooltip=\"{{ (picFile.progress >= 0 && picFile.progress < 100 && !picFile.errorMsg) ? \'Uploading...\' : \'\' || picFile.result && !picFile.errorMsg || (picFile.errorMsg) ? \'See message below for more details.\' : \'\'}}\"\r\n                tooltip-placement=\"top\" tooltip-trigger=\"\'mouseenter\'\">\r\n                <!--, \'hide\': !picFile.progress || picFile.progress != 100-->\r\n            </span>\r\n\r\n        </div>\r\n    </div>\r\n    <div class=\"col-xs-9 col-sm-6 mb-sm\">\r\n        <!--col-sm-8 -->\r\n        <label title=\"{{ form.i18n.filename ? form.i18n.filename : (\'modules.upload.field.filename\' | translate)  }}\" class=\"text-info\">{{ form.i18n.filename ? form.i18n.filename : (\'modules.upload.field.filename\' | translate)}}</label>\r\n        <div class=\"filename\" title=\"{{ picFile.name }}\">{{ picFile.name }}</div>\r\n    </div>\r\n\r\n    \r\n    <div class=\"col-sm-2 hidden-xs\">\r\n            <label title=\"Result\" class=\"text-info\">Size</label>\r\n            <small ng-switch=\"fileService.file.size > 1024*1024\">\r\n                <small ng-switch-when=\"true\">({{picFile.size / 1024 / 1024 | number:2}} Mb)</small>\r\n                <small ng-switch-default>({{picFile.size / 1024 | number:2}} kB)</small>\r\n            </small>\r\n        </div>\r\n\r\n    <div class=\"col-xs-5 col-sm-2 hidden-xs mb-sm\">\r\n        <!--col-sm-2 -->\r\n        <label title=\"{{ form.i18n.progress ? form.i18n.progress : (\'modules.upload.field.progress\' | translate)  }}\" class=\"text-info\">{{ form.i18n.progress ? form.i18n.progress : (\'modules.upload.field.progress\' | translate) }}</label>\r\n        <div class=\"progress\">\r\n            <div class=\"progress-bar progress-bar-striped\" role=\"progressbar\" ng-class=\"{\'progress-bar-success\': picFile.progress == 100, \'progress-bar-danger\': picFile.errorMsg}\"\r\n                ng-style=\"{width: picFile.progress + \'%\'}\">\r\n                {{ picFile.progress ? picFile.progress : 0 }} %\r\n            </div>\r\n        </div>\r\n    </div>\r\n    <div class=\"col-xs-1 col-sm-1 mb-sm\">\r\n        <label title=\"Result\" class=\"text-info\">&nbsp;</label>\r\n        <!--col-sm-1 -->\r\n        <button class=\"btn btn-xs btn-danger\" type=\"button\" ng-click=\"removeFile(picFile, $index)\">\r\n            <span class=\"glyphicon glyphicon-remove\"></span>\r\n        </button>\r\n    </div>\r\n</div>");
$templateCache.put("directives/decorators/bootstrap/nwp-file/schema-form-file.template.single.html","<div ngf-drop=\"selectFile(picFile, $invalidFile)\" ngf-select=\"selectFile(picFile, $invalidFile)\" type=\"file\" ngf-multiple=\"false\" ngf-invalid-model=\"$invalidFile\"\r\n    ng-model=\"picFile\" name=\"file\"\r\n    ngf-run-all-validations=\"true\"\r\n    ng-attr-ngf-pattern=\"{{form.schema.pattern && form.schema.pattern.mimeType ? form.schema.pattern.mimeType : undefined }}\"\r\n    ng-attr-ngf-max-size=\"{{form.schema.maxSize && form.schema.maxSize.maximum ? form.schema.maxSize.maximum : undefined }}\"\r\n    ng-required=\"form.required\"\r\n    accept=\"{{::form.schema.pattern.mimeType}}\"\r\n    ng-model-options=\"form.ngModelOptions\" ngf-drag-over-class=\"dragover\" class=\"drop-box dragAndDropDescription\">\r\n  <p class=\"text-center\">{{ \'modules.upload.descriptionSinglefile\' | translate }}</p>\r\n</div>\r\n<div ngf-no-file-drop>{{ \'modules.upload.dndNotSupported\' | translate}}</div>\r\n");}]);
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNjaGVtYS1mb3JtLWZpbGUuanMiLCJ0ZW1wbGF0ZXMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs4RUNoVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6InNjaGVtYS1mb3JtLWZpbGUuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogYW5ndWxhci1zY2hlbWEtZm9ybS1ud3AtZmlsZS11cGxvYWQgLSBVcGxvYWQgZmlsZSB0eXBlIGZvciBBbmd1bGFyIFNjaGVtYSBGb3JtXHJcbiAqIEB2ZXJzaW9uIHYwLjEuNVxyXG4gKiBAbGluayBodHRwczovL2dpdGh1Yi5jb20vc2FidXJhYi9hbmd1bGFyLXNjaGVtYS1mb3JtLW53cC1maWxlLXVwbG9hZFxyXG4gKiBAbGljZW5zZSBNSVRcclxuICovXHJcbid1c2Ugc3RyaWN0JztcclxuXHJcbmFuZ3VsYXJcclxuICAubW9kdWxlKCdzY2hlbWFGb3JtJylcclxuICAuY29uZmlnKFsnc2NoZW1hRm9ybVByb3ZpZGVyJywgJ3NjaGVtYUZvcm1EZWNvcmF0b3JzUHJvdmlkZXInLCAnc2ZQYXRoUHJvdmlkZXInLCAnc2ZCdWlsZGVyUHJvdmlkZXInLFxyXG4gICAgZnVuY3Rpb24gKHNjaGVtYUZvcm1Qcm92aWRlciwgc2NoZW1hRm9ybURlY29yYXRvcnNQcm92aWRlciwgc2ZQYXRoUHJvdmlkZXIsIHNmQnVpbGRlclByb3ZpZGVyKSB7XHJcbiAgICAgIHZhciBkZWZhdWx0UHJpb3JpdHkgPSAxO1xyXG5cclxuXHJcbiAgICAgIHZhciBfZGVmYXVsdFNpbmdsZUZpbGVVcGxvYWRWYWxpZGF0aW9uRXJyb3JNZXNzYWdlcyA9IHtcclxuICAgICAgICAnbWF4U2l6ZSc6ICdUaGlzIGZpbGUgaXMgdG9vIGxhcmdlICh7e2ZpbGUuc2l6ZSAvIDEwMDAwMDAgfCBudW1iZXI6Mn19TUIpLiBNYXhpbXVtIHNpemUgYWxsb3dlZCBpcyB7e3NjaGVtYS5tYXhTaXplLm1heGltdW19fScsXHJcbiAgICAgICAgJ3BhdHRlcm4nOiAnV3JvbmcgZmlsZSB0eXBlLiBBbGxvd2VkIHR5cGVzIGFyZSB7e3NjaGVtYS5wYXR0ZXJuLm1pbWVUeXBlfX0nXHJcbiAgICAgIH07XHJcblxyXG4gICAgICB2YXIgX2RlZmF1bHRNdWx0aUZpbGVVcGxvYWRWYWxpZGF0aW9uRXJyb3JNZXNzYWdlcyA9IHtcclxuICAgICAgICAnbWF4U2l6ZSc6IF9kZWZhdWx0U2luZ2xlRmlsZVVwbG9hZFZhbGlkYXRpb25FcnJvck1lc3NhZ2VzLm1heFNpemUsXHJcbiAgICAgICAgJ3BhdHRlcm4nOiBfZGVmYXVsdFNpbmdsZUZpbGVVcGxvYWRWYWxpZGF0aW9uRXJyb3JNZXNzYWdlcy5wYXR0ZXJuLFxyXG4gICAgICAgICdtaW5JdGVtcyc6ICdZb3UgaGF2ZSB0byB1cGxvYWQgYXQgbGVhc3Qge3tzY2hlbWEubWluSXRlbXN9fSBmaWxlKHMpJyxcclxuICAgICAgICAnbWF4SXRlbXMnOiAnWW91IGNhblxcJ3QgdXBsb2FkIG1vcmUgdGhhbiB7e3NjaGVtYS5tYXhJdGVtc319IGZpbGUocykuJ1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgZnVuY3Rpb24gX2FwcGx5RGVmYXVsdFZhbGlkYXRpb25FcnJvck1lc3NhZ2VzKGZvcm0sIHNjaGVtYSwgbWVzc2FnZXNPYmplY3QpIHtcclxuICAgICAgICBmb3JtLnZhbGlkYXRpb25NZXNzYWdlID0gZm9ybS52YWxpZGF0aW9uTWVzc2FnZSB8fCB7fTtcclxuICAgICAgICBmb3IgKHZhciBrZXl3b3JkIGluIG1lc3NhZ2VzT2JqZWN0KSB7XHJcbiAgICAgICAgICBpZiAoc2NoZW1hW2tleXdvcmRdICYmICFmb3JtLnZhbGlkYXRpb25NZXNzYWdlW2tleXdvcmRdKSB7XHJcbiAgICAgICAgICAgIGZvcm0udmFsaWRhdGlvbk1lc3NhZ2Vba2V5d29yZF0gPSBtZXNzYWdlc09iamVjdFtrZXl3b3JkXTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuXHJcblxyXG4gICAgICBmdW5jdGlvbiByZWdpc3RlckRlZmF1bHRUeXBlcygpIHtcclxuICAgICAgICBmdW5jdGlvbiBud3BTaW5nbGVmaWxlVXBsb2FkRGVmYXVsdFByb3ZpZGVyKG5hbWUsIHNjaGVtYSwgb3B0aW9ucykge1xyXG4gICAgICAgICAgaWYgKHNjaGVtYS50eXBlID09PSAnb2JqZWN0JyAmJiBzY2hlbWEuZm9ybWF0ID09PSAnc2luZ2xlZmlsZScpIHtcclxuICAgICAgICAgICAgdmFyIGYgPSBzY2hlbWFGb3JtUHJvdmlkZXIuc3RkRm9ybU9iaihuYW1lLCBzY2hlbWEsIG9wdGlvbnMpO1xyXG4gICAgICAgICAgICBmLmtleSA9IG9wdGlvbnMucGF0aDtcclxuICAgICAgICAgICAgZi50eXBlID0gJ253cEZpbGVVcGxvYWQnO1xyXG4gICAgICAgICAgICBvcHRpb25zLmxvb2t1cFtzZlBhdGhQcm92aWRlci5zdHJpbmdpZnkob3B0aW9ucy5wYXRoKV0gPSBmO1xyXG4gICAgICAgICAgICBfYXBwbHlEZWZhdWx0VmFsaWRhdGlvbkVycm9yTWVzc2FnZXMoZiwgc2NoZW1hLCBfZGVmYXVsdFNpbmdsZUZpbGVVcGxvYWRWYWxpZGF0aW9uRXJyb3JNZXNzYWdlcyk7XHJcbiAgICAgICAgICAgIHJldHVybiBmO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZnVuY3Rpb24gbndwTXVsdGlmaWxlVXBsb2FkRGVmYXVsdFByb3ZpZGVyKG5hbWUsIHNjaGVtYSwgb3B0aW9ucykge1xyXG4gICAgICAgICAgaWYgKHNjaGVtYS50eXBlID09PSAnYXJyYXknICYmIHNjaGVtYS5mb3JtYXQgPT09ICdtdWx0aWZpbGUnKSB7XHJcbiAgICAgICAgICAgIHZhciBmID0gc2NoZW1hRm9ybVByb3ZpZGVyLnN0ZEZvcm1PYmoobmFtZSwgc2NoZW1hLCBvcHRpb25zKTtcclxuICAgICAgICAgICAgZi5rZXkgPSBvcHRpb25zLnBhdGg7XHJcbiAgICAgICAgICAgIGYudHlwZSA9ICdud3BGaWxlVXBsb2FkJztcclxuICAgICAgICAgICAgb3B0aW9ucy5sb29rdXBbc2ZQYXRoUHJvdmlkZXIuc3RyaW5naWZ5KG9wdGlvbnMucGF0aCldID0gZjtcclxuICAgICAgICAgICAgX2FwcGx5RGVmYXVsdFZhbGlkYXRpb25FcnJvck1lc3NhZ2VzKGYsIHNjaGVtYSwgX2RlZmF1bHRNdWx0aUZpbGVVcGxvYWRWYWxpZGF0aW9uRXJyb3JNZXNzYWdlcyk7XHJcbiAgICAgICAgICAgIHJldHVybiBmO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc2NoZW1hRm9ybVByb3ZpZGVyLmRlZmF1bHRzLmFycmF5LnVuc2hpZnQobndwU2luZ2xlZmlsZVVwbG9hZERlZmF1bHRQcm92aWRlcik7XHJcbiAgICAgICAgc2NoZW1hRm9ybVByb3ZpZGVyLmRlZmF1bHRzLmFycmF5LnVuc2hpZnQobndwTXVsdGlmaWxlVXBsb2FkRGVmYXVsdFByb3ZpZGVyKTtcclxuICAgICAgfVxyXG5cclxuICAgICAgcmVnaXN0ZXJEZWZhdWx0VHlwZXMoKTtcclxuXHJcbiAgICAgIHNjaGVtYUZvcm1EZWNvcmF0b3JzUHJvdmlkZXIuZGVmaW5lQWRkT24oXHJcbiAgICAgICAgJ2Jvb3RzdHJhcERlY29yYXRvcicsXHJcbiAgICAgICAgJ253cEZpbGVVcGxvYWQnLFxyXG4gICAgICAgICdkaXJlY3RpdmVzL2RlY29yYXRvcnMvYm9vdHN0cmFwL253cC1maWxlL3NjaGVtYS1mb3JtLWZpbGUuaHRtbCcsXHJcbiAgICAgICAgLy8gZGVmYXVsdHNcclxuICAgICAgICBzZkJ1aWxkZXJQcm92aWRlci5zdGRCdWlsZGVyc1xyXG4gICAgICApO1xyXG4gICAgfVxyXG4gIF0pO1xyXG5cclxuYW5ndWxhclxyXG4gIC5tb2R1bGUoJ25nU2NoZW1hRm9ybUZpbGUnLCBbXHJcbiAgICAnbmdGaWxlVXBsb2FkJyxcclxuICAgICduZ01lc3NhZ2VzJ1xyXG4gIF0pXHJcbiAgLmRpcmVjdGl2ZSgnbmdTY2hlbWFGaWxlJywgWydVcGxvYWQnLCAnJHRpbWVvdXQnLCAnJHEnLCAnJGludGVycG9sYXRlJywgJyR0cmFuc2xhdGUnLCAnc3VibWlzc2lvblNlcnZpY2UnLCAnZmlsZVNlcnZpY2UnLCBmdW5jdGlvbiAoVXBsb2FkLCAkdGltZW91dCwgJHEsICRpbnRlcnBvbGF0ZSwgJHRyYW5zbGF0ZSwgc3VibWlzc2lvblNlcnZpY2UsIGZpbGVTZXJ2aWNlKSB7IC8vLCAnc3VibWlzc2lvblNlcnZpY2UnLCAnZmlsZVNlcnZpY2UnLCBzdWJtaXNzaW9uU2VydmljZSwgZmlsZVNlcnZpY2VcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHJlc3RyaWN0OiAnQScsXHJcbiAgICAgIHNjb3BlOiB0cnVlLFxyXG4gICAgICByZXF1aXJlOiAnbmdNb2RlbCcsXHJcbiAgICAgIGxpbms6IGZ1bmN0aW9uIChzY29wZSwgZWxlbWVudCwgYXR0cnMsIG5nTW9kZWwpIHtcclxuICAgICAgICBzY29wZS51cmwgPSBzY29wZS5mb3JtICYmIHNjb3BlLmZvcm0uZW5kcG9pbnQ7XHJcbiAgICAgICAgc2NvcGUuaXNTaW5nbGVmaWxlVXBsb2FkID0gc2NvcGUuZm9ybSAmJiBzY29wZS5mb3JtLnNjaGVtYSAmJiBzY29wZS5mb3JtLnNjaGVtYS5mb3JtYXQgPT09ICdzaW5nbGVmaWxlJztcclxuXHJcbiAgICAgICAgc2NvcGUuZmlsZVNlcnZpY2UgPSBmaWxlU2VydmljZTtcclxuXHJcblxyXG4gICAgICAgIHNjb3BlLnNlbGVjdEZpbGUgPSBmdW5jdGlvbiAoZmlsZSwgJGludmFsaWRGaWxlKSB7XHJcbiAgICAgICAgICBzY29wZS5pbnZhbGlkRmlsZSA9ICRpbnZhbGlkRmlsZTtcclxuICAgICAgICAgIHNjb3BlLnBpY0ZpbGUgPSBmaWxlO1xyXG4gICAgICAgICAgaWYgKGZpbGUgJiYgZmlsZSAhPSBudWxsKVxyXG4gICAgICAgICAgICBzY29wZS51cGxvYWRGaWxlKGZpbGUpO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgc2NvcGUuc2VsZWN0RmlsZXMgPSBmdW5jdGlvbiAoZmlsZXMsICRpbnZhbGlkRmlsZXMpIHtcclxuICAgICAgICAgIHNjb3BlLmludmFsaWRGaWxlcyA9ICRpbnZhbGlkRmlsZXM7XHJcbiAgICAgICAgICBzY29wZS5waWNGaWxlcyA9IGZpbGVzO1xyXG4gICAgICAgICAgaWYgKGZpbGVzICYmIGZpbGVzICE9IG51bGwgJiYgZmlsZXMubGVuZ3RoID4gMClcclxuICAgICAgICAgICAgc2NvcGUudXBsb2FkRmlsZXMoZmlsZXMpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHNjb3BlLnVwbG9hZEZpbGUgPSBmdW5jdGlvbiAoZmlsZSkge1xyXG4gICAgICAgICAgZmlsZSAmJiBkb1VwbG9hZChmaWxlKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBzY29wZS51cGxvYWRGaWxlcyA9IGZ1bmN0aW9uIChmaWxlcykge1xyXG4gICAgICAgICAgZmlsZXMubGVuZ3RoICYmIGFuZ3VsYXIuZm9yRWFjaChmaWxlcywgZnVuY3Rpb24gKGZpbGUpIHtcclxuICAgICAgICAgICAgZG9VcGxvYWQoZmlsZSk7XHJcbiAgICAgICAgICB9KTtcclxuICAgICAgICB9O1xyXG5cclxuXHJcblxyXG5cclxuICAgICAgICBmdW5jdGlvbiBfbWVyZ2VEYXRhVG9OZ01vZGVsVmFsdWUobW9kZWwpIHtcclxuICAgICAgICAgIGlmIChzY29wZS5pc1NpbmdsZWZpbGVVcGxvYWQpIHtcclxuICAgICAgICAgICAgaWYgKG5nTW9kZWwuJG1vZGVsVmFsdWUpIHtcclxuICAgICAgICAgICAgICBuZ01vZGVsLiRzZXRWaWV3VmFsdWUoYW5ndWxhci5tZXJnZShuZ01vZGVsLiRtb2RlbFZhbHVlLCBtb2RlbCkpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgIG5nTW9kZWwuJHNldFZpZXdWYWx1ZShtb2RlbCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGlmIChuZ01vZGVsLiRtb2RlbFZhbHVlKSB7XHJcbiAgICAgICAgICAgICAgbmdNb2RlbC4kc2V0Vmlld1ZhbHVlKG5nTW9kZWwuJG1vZGVsVmFsdWUuY29uY2F0KG1vZGVsKSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgbmdNb2RlbC4kc2V0Vmlld1ZhbHVlKFttb2RlbF0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBuZ01vZGVsLiRjb21taXRWaWV3VmFsdWUoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHZhciBmaWxlUmVzdWx0ID0gbnVsbDtcclxuXHJcbiAgICAgICAgZnVuY3Rpb24gZG9VcGxvYWQoZmlsZSkge1xyXG4gICAgICAgICAgaWYgKGZpbGUgJiYgIWZpbGUuJGVycm9yICYmIHNjb3BlLnVybCkge1xyXG4gICAgICAgICAgICB2YXIgb3B0aW9ucyA9IHtcclxuICAgICAgICAgICAgICB1cmw6IHNjb3BlLnVybCxcclxuICAgICAgICAgICAgICBkYXRhOiB7XHJcbiAgICAgICAgICAgICAgICBmaWxlOiB7fSxcclxuICAgICAgICAgICAgICAgIGV2ZW50SWQ6IHt9LFxyXG4gICAgICAgICAgICAgICAgdXNlcklkOiB7fSxcclxuICAgICAgICAgICAgICAgIHByaW9yaXR5OiBzY29wZS5mb3JtLnNjaGVtYS5wcmlvcml0eVxyXG4gICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfTtcclxuXHJcbiAgICAgICAgICAgIG9wdGlvbnMuZGF0YVtzY29wZS5mb3JtLmZpbGVOYW1lIHx8ICdmaWxlJ10gPSBmaWxlO1xyXG4gICAgICAgICAgICBvcHRpb25zLmRhdGFbJ2V2ZW50SWQnXSA9IHN1Ym1pc3Npb25TZXJ2aWNlLmdldFJlcG9ydFR5cGUoKS5yZXBvcnRUeXBlLnZhbHVlO1xyXG4gICAgICAgICAgICBvcHRpb25zLmRhdGFbJ3VzZXJJZCddID0gc3VibWlzc2lvblNlcnZpY2UuZ2V0VXNlcklkKCk7XHJcbiAgICAgICAgICAgIGZpbGUudXBsb2FkID0gVXBsb2FkLnVwbG9hZChvcHRpb25zKTtcclxuXHJcbiAgICAgICAgICAgIGZpbGUudXBsb2FkLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XHJcbiAgICAgICAgICAgICAgJHRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgZmlsZS5yZXN1bHQgPSByZXNwb25zZS5kYXRhLm1lc3NhZ2U7XHJcbiAgICAgICAgICAgICAgICBmaWxlLnV1aWQgPSByZXNwb25zZS5kYXRhLmZpbGVbMF0udXVpZDtcclxuICAgICAgICAgICAgICAgIGZpbGUudXBsb2FkQ29tcGxldGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIGZpbGUucHJvZ3Jlc3MgPSAxMDA7XHJcbiAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgLy9maWxlUmVzdWx0ID0gcmVzcG9uc2UuZGF0YS5maWxlO1xyXG4gICAgICAgICAgICAgIF9tZXJnZURhdGFUb05nTW9kZWxWYWx1ZShyZXNwb25zZS5kYXRhLmZpbGVbMF0pO1xyXG4gICAgICAgICAgICB9LCBmdW5jdGlvbiAocmVzcG9uc2UpIHtcclxuICAgICAgICAgICAgICBpZiAocmVzcG9uc2Uuc3RhdHVzID4gMCkge1xyXG4gICAgICAgICAgICAgICAgZmlsZS5lcnJvck1zZyA9IHJlc3BvbnNlLnN0YXR1cyArICc6ICcgKyByZXNwb25zZS5kYXRhLm1lc3NhZ2U7XHJcbiAgICAgICAgICAgICAgfSBlbHNlIGlmIChyZXNwb25zZS5zdGF0dXMgPT0gLTEpIHtcclxuICAgICAgICAgICAgICAgIGZpbGUuZXJyb3JNc2cgPSBcIkVycm9yOiB0cm91YmxlIGNvbm5lY3RpbmcgdG8gdGhlIHNlcnZlciwgcGxlYXNlIHZlcmlmeSB5b3UgaGF2ZSBpbnRlcm5ldCBhY2Nlc3MuXCI7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgLy8gLnRoZW4oZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAvLyAgIGlmIChmaWxlUmVzdWx0ICYmIGZpbGVSZXN1bHQgIT0gbnVsbCAmJiBmaWxlUmVzdWx0LmZpbGUpXHJcbiAgICAgICAgICAgIC8vICAgICBmaWxlU2VydmljZS5zZXRGaWxlKGZpbGVSZXN1bHQuZmlsZVswXSk7XHJcbiAgICAgICAgICAgIC8vIH0pO1xyXG5cclxuICAgICAgICAgICAgZmlsZS51cGxvYWQucHJvZ3Jlc3MoZnVuY3Rpb24gKGV2dCkge1xyXG4gICAgICAgICAgICAgIGZpbGUucHJvZ3Jlc3MgPSBNYXRoLm1pbigxMDAsIHBhcnNlSW50KDEwMC4wICpcclxuICAgICAgICAgICAgICAgIGV2dC5sb2FkZWQgLyBldnQudG90YWwpKTtcclxuICAgICAgICAgICAgICBpZiAoZmlsZS5wcm9ncmVzcyA9PSAxMDAgJiYgIWZpbGUudXBsb2FkQ29tcGxldGVkKSB7XHJcbiAgICAgICAgICAgICAgICAvL2JlY2F1c2Ugd2UgbmVlZCB0aGUgcmVzcG9uc2UgdG8gcmV0dXJuLCB3ZSBhcmVuJ3QgdHJ1ZWx5IGF0IDEwMCUgY29tcGxldGUsIHVudGlsIHRoZSByZXBvbnNlIGlzIHJldHVybmVkLiBuZy1maWxlLXVwbG9hZCBzYXlzIHdlJ3JlIGF0IDEwMCUgd2hlbiB0aGUgZmlsZSBpcyBzZW50IHRvIHRoZSBzZXJ2ZXIuXHJcbiAgICAgICAgICAgICAgICBmaWxlLnByb2dyZXNzID0gOTk7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZ1bmN0aW9uIF9jbGVhckVycm9yTXNnKCkge1xyXG4gICAgICAgICAgZGVsZXRlIHNjb3BlLmVycm9yTXNnO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZnVuY3Rpb24gX3Jlc2V0RmllbGROZ01vZGVsKGlzQXJyYXkpIHtcclxuICAgICAgICAgIGlmIChpc0FycmF5KSB7XHJcbiAgICAgICAgICAgIG5nTW9kZWwuJHNldFZpZXdWYWx1ZShbXSk7XHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBuZ01vZGVsLiRzZXRWaWV3VmFsdWUoKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIG5nTW9kZWwuJGNvbW1pdFZpZXdWYWx1ZSgpO1xyXG4gICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgIC8vIFRoaXMgaXMgdGhlIG5nTW9kZWwgb2YgdGhlIFwiZmlsZVwiIGlucHV0LCBpbnN0ZWFkIG9mIHRoZSBuZ01vZGVsIG9mIHRoZSB3aG9sZSBmb3JtXHJcbiAgICAgICAgZnVuY3Rpb24gX3Jlc2V0RmlsZU5nTW9kZWwoKSB7XHJcbiAgICAgICAgICB2YXIgZmlsZU5nTW9kZWwgPSBzY29wZS51cGxvYWRGb3JtLmZpbGU7XHJcbiAgICAgICAgICBmaWxlTmdNb2RlbC4kc2V0Vmlld1ZhbHVlKCk7XHJcbiAgICAgICAgICBmaWxlTmdNb2RlbC4kY29tbWl0Vmlld1ZhbHVlKCk7XHJcbiAgICAgICAgICBkZWxldGUgc2NvcGUucGljRmlsZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFRoaXMgaXMgdGhlIG5nTW9kZWwgb2YgdGhlIFwiZmlsZVwiIGlucHV0LCBpbnN0ZWFkIG9mIHRoZSBuZ01vZGVsIG9mIHRoZSB3aG9sZSBmb3JtXHJcbiAgICAgICAgZnVuY3Rpb24gX3Jlc2V0RmlsZXNOZ01vZGVsKGluZGV4KSB7XHJcbiAgICAgICAgICB2YXIgZmlsZU5nTW9kZWwgPSBzY29wZS51cGxvYWRGb3JtLmZpbGVzO1xyXG4gICAgICAgICAgaWYgKHNjb3BlLnBpY0ZpbGVzLmxlbmd0aCA9PT0gMSkge1xyXG4gICAgICAgICAgICBmaWxlTmdNb2RlbC4kc2V0Vmlld1ZhbHVlKCk7XHJcbiAgICAgICAgICAgIGRlbGV0ZSBzY29wZS5waWNGaWxlcztcclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHNjb3BlLnBpY0ZpbGVzLnNwbGljZShpbmRleCwgMSk7XHJcbiAgICAgICAgICAgIGZpbGVOZ01vZGVsLiRzZXRWaWV3VmFsdWUoc2NvcGUucGljRmlsZXMpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgZmlsZU5nTW9kZWwuJGNvbW1pdFZpZXdWYWx1ZSgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc2NvcGUucmVtb3ZlSW52YWxpZEZpbGUgPSBmdW5jdGlvbiAoaW52YWxpZEZpbGUsIGluZGV4KSB7XHJcbiAgICAgICAgICBpZiAoc2NvcGUuaXNTaW5nbGVmaWxlVXBsb2FkKSB7XHJcbiAgICAgICAgICAgIGRlbGV0ZSBzY29wZS5pbnZhbGlkRmlsZTtcclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHNjb3BlLmludmFsaWRGaWxlcy5zcGxpY2UoaW5kZXgsIDEpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHNjb3BlLnJlbW92ZUZpbGUgPSBmdW5jdGlvbiAoZmlsZSwgaW5kZXgpIHtcclxuICAgICAgICAgIGlmIChzY29wZS5pc1NpbmdsZWZpbGVVcGxvYWQpIHtcclxuICAgICAgICAgICAgaWYgKGZpbGUgJiYgZmlsZS51dWlkKVxyXG4gICAgICAgICAgICAgIHNjb3BlLmZpbGVTZXJ2aWNlLmRlbGV0ZUZpbGUoZmlsZS51dWlkKTtcclxuXHJcbiAgICAgICAgICAgIF9jbGVhckVycm9yTXNnKCk7XHJcbiAgICAgICAgICAgIF9yZXNldEZpZWxkTmdNb2RlbCh0cnVlKTtcclxuICAgICAgICAgICAgX3Jlc2V0RmlsZU5nTW9kZWwoKTtcclxuXHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBpZiAoZmlsZSAmJiBmaWxlLnV1aWQpXHJcbiAgICAgICAgICAgICAgc2NvcGUuZmlsZVNlcnZpY2UuZGVsZXRlRmlsZShmaWxlLnV1aWQpO1xyXG5cclxuICAgICAgICAgICAgX2NsZWFyRXJyb3JNc2coKTtcclxuICAgICAgICAgICAgX3Jlc2V0RmllbGROZ01vZGVsKHRydWUpO1xyXG4gICAgICAgICAgICBfcmVzZXRGaWxlc05nTW9kZWwoaW5kZXgpO1xyXG5cclxuICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBzY29wZS52YWxpZGF0ZUZpZWxkID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgaWYgKHNjb3BlLnVwbG9hZEZvcm0uZmlsZSAmJiBzY29wZS51cGxvYWRGb3JtLmZpbGUuJHZhbGlkICYmIHNjb3BlLnBpY0ZpbGUgJiYgIXNjb3BlLnBpY0ZpbGUuJGVycm9yKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzaW5nbGVmaWxlLWZvcm0gaXMgaW52YWxpZCcpO1xyXG4gICAgICAgICAgfSBlbHNlIGlmIChzY29wZS51cGxvYWRGb3JtLmZpbGVzICYmIHNjb3BlLnVwbG9hZEZvcm0uZmlsZXMuJHZhbGlkICYmIHNjb3BlLnBpY0ZpbGVzICYmICFzY29wZS5waWNGaWxlcy4kZXJyb3IpIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ211bHRpZmlsZS1mb3JtIGlzICBpbnZhbGlkJyk7XHJcbiAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnc2luZ2xlLSBhbmQgbXVsdGlmaWxlLWZvcm0gYXJlIHZhbGlkJyk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgc2NvcGUuc3VibWl0ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgaWYgKHNjb3BlLnVwbG9hZEZvcm0uZmlsZSAmJiBzY29wZS51cGxvYWRGb3JtLmZpbGUuJHZhbGlkICYmIHNjb3BlLnBpY0ZpbGUgJiYgIXNjb3BlLnBpY0ZpbGUuJGVycm9yKSB7XHJcbiAgICAgICAgICAgIHNjb3BlLnVwbG9hZEZpbGUoc2NvcGUucGljRmlsZSk7XHJcbiAgICAgICAgICB9IGVsc2UgaWYgKHNjb3BlLnVwbG9hZEZvcm0uZmlsZXMgJiYgc2NvcGUudXBsb2FkRm9ybS5maWxlcy4kdmFsaWQgJiYgc2NvcGUucGljRmlsZXMgJiYgIXNjb3BlLnBpY0ZpbGVzLiRlcnJvcikge1xyXG4gICAgICAgICAgICBzY29wZS51cGxvYWRGaWxlcyhzY29wZS5waWNGaWxlcyk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgc2NvcGUuJG9uKCdzY2hlbWFGb3JtVmFsaWRhdGUnLCBzY29wZS52YWxpZGF0ZUZpZWxkKTtcclxuICAgICAgICBzY29wZS4kb24oJ3NjaGVtYUZvcm1GaWxlVXBsb2FkU3VibWl0Jywgc2NvcGUuc3VibWl0KTtcclxuXHJcbiAgICAgICAgc2NvcGUuaW50ZXJwVmFsaWRhdGlvbk1lc3NhZ2UgPSBmdW5jdGlvbiBpbnRlcnBWYWxpZGF0aW9uTWVzc2FnZShlcnJvclR5cGUsIGludmFsaWRGaWxlKSB7XHJcbiAgICAgICAgICBpZiAoIWludmFsaWRGaWxlKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICB2YXIgZXJyb3IgPSBlcnJvclR5cGU7IC8vaW52YWxpZEZpbGUuJGVycm9yOyAvLyBlLmcuLCAnbWF4U2l6ZSdcclxuICAgICAgICAgIHZhciBmb3JtID0gc2NvcGUuZm9ybTtcclxuICAgICAgICAgIHZhciB2YWxpZGF0aW9uTWVzc2FnZSA9IGZvcm0gJiYgZm9ybS5zY2hlbWEgPyBmb3JtLnZhbGlkYXRpb25NZXNzYWdlIDogZm9ybS5zY2hlbWEudmFsaWRhdGlvbk1lc3NhZ2UgPyBmb3JtLnNjaGVtYS52YWxpZGF0aW9uTWVzc2FnZSA6IHVuZGVmaW5lZDtcclxuICAgICAgICAgIHZhciBtZXNzYWdlO1xyXG4gICAgICAgICAgaWYgKGFuZ3VsYXIuaXNTdHJpbmcodmFsaWRhdGlvbk1lc3NhZ2UpKSB7XHJcbiAgICAgICAgICAgIG1lc3NhZ2UgPSB2YWxpZGF0aW9uTWVzc2FnZTtcclxuICAgICAgICAgIH0gZWxzZSBpZiAoYW5ndWxhci5pc09iamVjdCh2YWxpZGF0aW9uTWVzc2FnZSkpIHtcclxuICAgICAgICAgICAgbWVzc2FnZSA9IHZhbGlkYXRpb25NZXNzYWdlW2Vycm9yXTtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICBpZiAoIW1lc3NhZ2UpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGVycm9yO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIHZhciBjb250ZXh0ID0ge1xyXG4gICAgICAgICAgICBlcnJvcjogZXJyb3IsXHJcbiAgICAgICAgICAgIGZpbGU6IGludmFsaWRGaWxlLFxyXG4gICAgICAgICAgICBmb3JtOiBmb3JtLFxyXG4gICAgICAgICAgICBzY2hlbWE6IGZvcm0uc2NoZW1hLFxyXG4gICAgICAgICAgICB0aXRsZTogZm9ybS50aXRsZSB8fCAoZm9ybS5zY2hlbWEgJiYgZm9ybS5zY2hlbWEudGl0bGUpXHJcbiAgICAgICAgICB9O1xyXG4gICAgICAgICAgdmFyIGludGVycG9sYXRlZE1lc3NhZ2UgPSAkaW50ZXJwb2xhdGUobWVzc2FnZSkoY29udGV4dCk7XHJcblxyXG4gICAgICAgICAgcmV0dXJuICR0cmFuc2xhdGUuaW5zdGFudChpbnRlcnBvbGF0ZWRNZXNzYWdlKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgfVxyXG4gICAgfTtcclxuICB9XSk7IixudWxsXX0=
