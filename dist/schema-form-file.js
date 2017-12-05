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
//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNjaGVtYS1mb3JtLWZpbGUuanMiLCJ0ZW1wbGF0ZXMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs4RUNoVEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6InNjaGVtYS1mb3JtLWZpbGUuanMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogYW5ndWxhci1zY2hlbWEtZm9ybS1ud3AtZmlsZS11cGxvYWQgLSBVcGxvYWQgZmlsZSB0eXBlIGZvciBBbmd1bGFyIFNjaGVtYSBGb3JtXHJcbiAqIEB2ZXJzaW9uIHYwLjEuNVxyXG4gKiBAbGluayBodHRwczovL2dpdGh1Yi5jb20vc2FidXJhYi9hbmd1bGFyLXNjaGVtYS1mb3JtLW53cC1maWxlLXVwbG9hZFxyXG4gKiBAbGljZW5zZSBNSVRcclxuICovXHJcbid1c2Ugc3RyaWN0JztcclxuXHJcbmFuZ3VsYXJcclxuICAubW9kdWxlKCdzY2hlbWFGb3JtJylcclxuICAuY29uZmlnKFsnc2NoZW1hRm9ybVByb3ZpZGVyJywgJ3NjaGVtYUZvcm1EZWNvcmF0b3JzUHJvdmlkZXInLCAnc2ZQYXRoUHJvdmlkZXInLCAnc2ZCdWlsZGVyUHJvdmlkZXInLFxyXG4gICAgZnVuY3Rpb24gKHNjaGVtYUZvcm1Qcm92aWRlciwgc2NoZW1hRm9ybURlY29yYXRvcnNQcm92aWRlciwgc2ZQYXRoUHJvdmlkZXIsIHNmQnVpbGRlclByb3ZpZGVyKSB7XHJcbiAgICAgIHZhciBkZWZhdWx0UHJpb3JpdHkgPSAxO1xyXG5cclxuXHJcbiAgICAgIHZhciBfZGVmYXVsdFNpbmdsZUZpbGVVcGxvYWRWYWxpZGF0aW9uRXJyb3JNZXNzYWdlcyA9IHtcclxuICAgICAgICAnbWF4U2l6ZSc6ICdUaGlzIGZpbGUgaXMgdG9vIGxhcmdlICh7e2ZpbGUuc2l6ZSAvIDEwMDAwMDAgfCBudW1iZXI6Mn19TUIpLiBNYXhpbXVtIHNpemUgYWxsb3dlZCBpcyB7e3NjaGVtYS5tYXhTaXplLm1heGltdW19fScsXHJcbiAgICAgICAgJ3BhdHRlcm4nOiAnV3JvbmcgZmlsZSB0eXBlLiBBbGxvd2VkIHR5cGVzIGFyZSB7e3NjaGVtYS5wYXR0ZXJuLm1pbWVUeXBlfX0nXHJcbiAgICAgIH07XHJcblxyXG4gICAgICB2YXIgX2RlZmF1bHRNdWx0aUZpbGVVcGxvYWRWYWxpZGF0aW9uRXJyb3JNZXNzYWdlcyA9IHtcclxuICAgICAgICAnbWF4U2l6ZSc6IF9kZWZhdWx0U2luZ2xlRmlsZVVwbG9hZFZhbGlkYXRpb25FcnJvck1lc3NhZ2VzLm1heFNpemUsXHJcbiAgICAgICAgJ3BhdHRlcm4nOiBfZGVmYXVsdFNpbmdsZUZpbGVVcGxvYWRWYWxpZGF0aW9uRXJyb3JNZXNzYWdlcy5wYXR0ZXJuLFxyXG4gICAgICAgICdtaW5JdGVtcyc6ICdZb3UgaGF2ZSB0byB1cGxvYWQgYXQgbGVhc3Qge3tzY2hlbWEubWluSXRlbXN9fSBmaWxlKHMpJyxcclxuICAgICAgICAnbWF4SXRlbXMnOiAnWW91IGNhblxcJ3QgdXBsb2FkIG1vcmUgdGhhbiB7e3NjaGVtYS5tYXhJdGVtc319IGZpbGUocykuJ1xyXG4gICAgICB9O1xyXG5cclxuICAgICAgZnVuY3Rpb24gX2FwcGx5RGVmYXVsdFZhbGlkYXRpb25FcnJvck1lc3NhZ2VzKGZvcm0sIHNjaGVtYSwgbWVzc2FnZXNPYmplY3QpIHtcclxuICAgICAgICBmb3JtLnZhbGlkYXRpb25NZXNzYWdlID0gZm9ybS52YWxpZGF0aW9uTWVzc2FnZSB8fCB7fTtcclxuICAgICAgICBmb3IgKHZhciBrZXl3b3JkIGluIG1lc3NhZ2VzT2JqZWN0KSB7XHJcbiAgICAgICAgICBpZiAoc2NoZW1hW2tleXdvcmRdICYmICFmb3JtLnZhbGlkYXRpb25NZXNzYWdlW2tleXdvcmRdKSB7XHJcbiAgICAgICAgICAgIGZvcm0udmFsaWRhdGlvbk1lc3NhZ2Vba2V5d29yZF0gPSBtZXNzYWdlc09iamVjdFtrZXl3b3JkXTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuXHJcblxyXG4gICAgICBmdW5jdGlvbiByZWdpc3RlckRlZmF1bHRUeXBlcygpIHtcclxuICAgICAgICBmdW5jdGlvbiBud3BTaW5nbGVmaWxlVXBsb2FkRGVmYXVsdFByb3ZpZGVyKG5hbWUsIHNjaGVtYSwgb3B0aW9ucykge1xyXG4gICAgICAgICAgaWYgKHNjaGVtYS50eXBlID09PSAnYXJyYXknICYmIHNjaGVtYS5mb3JtYXQgPT09ICdzaW5nbGVmaWxlJykge1xyXG4gICAgICAgICAgICB2YXIgZiA9IHNjaGVtYUZvcm1Qcm92aWRlci5zdGRGb3JtT2JqKG5hbWUsIHNjaGVtYSwgb3B0aW9ucyk7XHJcbiAgICAgICAgICAgIGYua2V5ID0gb3B0aW9ucy5wYXRoO1xyXG4gICAgICAgICAgICBmLnR5cGUgPSAnbndwRmlsZVVwbG9hZCc7XHJcbiAgICAgICAgICAgIG9wdGlvbnMubG9va3VwW3NmUGF0aFByb3ZpZGVyLnN0cmluZ2lmeShvcHRpb25zLnBhdGgpXSA9IGY7XHJcbiAgICAgICAgICAgIF9hcHBseURlZmF1bHRWYWxpZGF0aW9uRXJyb3JNZXNzYWdlcyhmLCBzY2hlbWEsIF9kZWZhdWx0U2luZ2xlRmlsZVVwbG9hZFZhbGlkYXRpb25FcnJvck1lc3NhZ2VzKTtcclxuICAgICAgICAgICAgcmV0dXJuIGY7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmdW5jdGlvbiBud3BNdWx0aWZpbGVVcGxvYWREZWZhdWx0UHJvdmlkZXIobmFtZSwgc2NoZW1hLCBvcHRpb25zKSB7XHJcbiAgICAgICAgICBpZiAoc2NoZW1hLnR5cGUgPT09ICdhcnJheScgJiYgc2NoZW1hLmZvcm1hdCA9PT0gJ211bHRpZmlsZScpIHtcclxuICAgICAgICAgICAgdmFyIGYgPSBzY2hlbWFGb3JtUHJvdmlkZXIuc3RkRm9ybU9iaihuYW1lLCBzY2hlbWEsIG9wdGlvbnMpO1xyXG4gICAgICAgICAgICBmLmtleSA9IG9wdGlvbnMucGF0aDtcclxuICAgICAgICAgICAgZi50eXBlID0gJ253cEZpbGVVcGxvYWQnO1xyXG4gICAgICAgICAgICBvcHRpb25zLmxvb2t1cFtzZlBhdGhQcm92aWRlci5zdHJpbmdpZnkob3B0aW9ucy5wYXRoKV0gPSBmO1xyXG4gICAgICAgICAgICBfYXBwbHlEZWZhdWx0VmFsaWRhdGlvbkVycm9yTWVzc2FnZXMoZiwgc2NoZW1hLCBfZGVmYXVsdE11bHRpRmlsZVVwbG9hZFZhbGlkYXRpb25FcnJvck1lc3NhZ2VzKTtcclxuICAgICAgICAgICAgcmV0dXJuIGY7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzY2hlbWFGb3JtUHJvdmlkZXIuZGVmYXVsdHMuYXJyYXkudW5zaGlmdChud3BTaW5nbGVmaWxlVXBsb2FkRGVmYXVsdFByb3ZpZGVyKTtcclxuICAgICAgICBzY2hlbWFGb3JtUHJvdmlkZXIuZGVmYXVsdHMuYXJyYXkudW5zaGlmdChud3BNdWx0aWZpbGVVcGxvYWREZWZhdWx0UHJvdmlkZXIpO1xyXG4gICAgICB9XHJcblxyXG4gICAgICByZWdpc3RlckRlZmF1bHRUeXBlcygpO1xyXG5cclxuICAgICAgc2NoZW1hRm9ybURlY29yYXRvcnNQcm92aWRlci5kZWZpbmVBZGRPbihcclxuICAgICAgICAnYm9vdHN0cmFwRGVjb3JhdG9yJyxcclxuICAgICAgICAnbndwRmlsZVVwbG9hZCcsXHJcbiAgICAgICAgJ2RpcmVjdGl2ZXMvZGVjb3JhdG9ycy9ib290c3RyYXAvbndwLWZpbGUvc2NoZW1hLWZvcm0tZmlsZS5odG1sJyxcclxuICAgICAgICAvLyBkZWZhdWx0c1xyXG4gICAgICAgIHNmQnVpbGRlclByb3ZpZGVyLnN0ZEJ1aWxkZXJzXHJcbiAgICAgICk7XHJcbiAgICB9XHJcbiAgXSk7XHJcblxyXG5hbmd1bGFyXHJcbiAgLm1vZHVsZSgnbmdTY2hlbWFGb3JtRmlsZScsIFtcclxuICAgICduZ0ZpbGVVcGxvYWQnLFxyXG4gICAgJ25nTWVzc2FnZXMnXHJcbiAgXSlcclxuICAuZGlyZWN0aXZlKCduZ1NjaGVtYUZpbGUnLCBbJ1VwbG9hZCcsICckdGltZW91dCcsICckcScsICckaW50ZXJwb2xhdGUnLCAnJHRyYW5zbGF0ZScsICdzdWJtaXNzaW9uU2VydmljZScsICdmaWxlU2VydmljZScsIGZ1bmN0aW9uIChVcGxvYWQsICR0aW1lb3V0LCAkcSwgJGludGVycG9sYXRlLCAkdHJhbnNsYXRlLCBzdWJtaXNzaW9uU2VydmljZSwgZmlsZVNlcnZpY2UpIHsgLy8sICdzdWJtaXNzaW9uU2VydmljZScsICdmaWxlU2VydmljZScsIHN1Ym1pc3Npb25TZXJ2aWNlLCBmaWxlU2VydmljZVxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgcmVzdHJpY3Q6ICdBJyxcclxuICAgICAgc2NvcGU6IHRydWUsXHJcbiAgICAgIHJlcXVpcmU6ICduZ01vZGVsJyxcclxuICAgICAgbGluazogZnVuY3Rpb24gKHNjb3BlLCBlbGVtZW50LCBhdHRycywgbmdNb2RlbCkge1xyXG4gICAgICAgIHNjb3BlLnVybCA9IHNjb3BlLmZvcm0gJiYgc2NvcGUuZm9ybS5lbmRwb2ludDtcclxuICAgICAgICBzY29wZS5pc1NpbmdsZWZpbGVVcGxvYWQgPSBzY29wZS5mb3JtICYmIHNjb3BlLmZvcm0uc2NoZW1hICYmIHNjb3BlLmZvcm0uc2NoZW1hLmZvcm1hdCA9PT0gJ3NpbmdsZWZpbGUnO1xyXG5cclxuICAgICAgICBzY29wZS5maWxlU2VydmljZSA9IGZpbGVTZXJ2aWNlO1xyXG5cclxuXHJcbiAgICAgICAgc2NvcGUuc2VsZWN0RmlsZSA9IGZ1bmN0aW9uIChmaWxlLCAkaW52YWxpZEZpbGUpIHtcclxuICAgICAgICAgIHNjb3BlLmludmFsaWRGaWxlID0gJGludmFsaWRGaWxlO1xyXG4gICAgICAgICAgc2NvcGUucGljRmlsZSA9IGZpbGU7XHJcbiAgICAgICAgICBpZiAoZmlsZSAmJiBmaWxlICE9IG51bGwpXHJcbiAgICAgICAgICAgIHNjb3BlLnVwbG9hZEZpbGUoZmlsZSk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICBzY29wZS5zZWxlY3RGaWxlcyA9IGZ1bmN0aW9uIChmaWxlcywgJGludmFsaWRGaWxlcykge1xyXG4gICAgICAgICAgc2NvcGUuaW52YWxpZEZpbGVzID0gJGludmFsaWRGaWxlcztcclxuICAgICAgICAgIHNjb3BlLnBpY0ZpbGVzID0gZmlsZXM7XHJcbiAgICAgICAgICBpZiAoZmlsZXMgJiYgZmlsZXMgIT0gbnVsbCAmJiBmaWxlcy5sZW5ndGggPiAwKVxyXG4gICAgICAgICAgICBzY29wZS51cGxvYWRGaWxlcyhmaWxlcyk7XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgc2NvcGUudXBsb2FkRmlsZSA9IGZ1bmN0aW9uIChmaWxlKSB7XHJcbiAgICAgICAgICBmaWxlICYmIGRvVXBsb2FkKGZpbGUpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHNjb3BlLnVwbG9hZEZpbGVzID0gZnVuY3Rpb24gKGZpbGVzKSB7XHJcbiAgICAgICAgICBmaWxlcy5sZW5ndGggJiYgYW5ndWxhci5mb3JFYWNoKGZpbGVzLCBmdW5jdGlvbiAoZmlsZSkge1xyXG4gICAgICAgICAgICBkb1VwbG9hZChmaWxlKTtcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgIH07XHJcblxyXG5cclxuXHJcblxyXG4gICAgICAgIGZ1bmN0aW9uIF9tZXJnZURhdGFUb05nTW9kZWxWYWx1ZShtb2RlbCkge1xyXG4gICAgICAgICAgaWYgKHNjb3BlLmlzU2luZ2xlZmlsZVVwbG9hZCkge1xyXG4gICAgICAgICAgICBpZiAobmdNb2RlbC4kbW9kZWxWYWx1ZSkge1xyXG4gICAgICAgICAgICAgIG5nTW9kZWwuJHNldFZpZXdWYWx1ZShhbmd1bGFyLm1lcmdlKG5nTW9kZWwuJG1vZGVsVmFsdWUsIG1vZGVsKSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgbmdNb2RlbC4kc2V0Vmlld1ZhbHVlKG1vZGVsKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgaWYgKG5nTW9kZWwuJG1vZGVsVmFsdWUpIHtcclxuICAgICAgICAgICAgICBuZ01vZGVsLiRzZXRWaWV3VmFsdWUobmdNb2RlbC4kbW9kZWxWYWx1ZS5jb25jYXQobW9kZWwpKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICBuZ01vZGVsLiRzZXRWaWV3VmFsdWUoW21vZGVsXSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgIH1cclxuICAgICAgICAgIG5nTW9kZWwuJGNvbW1pdFZpZXdWYWx1ZSgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdmFyIGZpbGVSZXN1bHQgPSBudWxsO1xyXG5cclxuICAgICAgICBmdW5jdGlvbiBkb1VwbG9hZChmaWxlKSB7XHJcbiAgICAgICAgICBpZiAoZmlsZSAmJiAhZmlsZS4kZXJyb3IgJiYgc2NvcGUudXJsKSB7XHJcbiAgICAgICAgICAgIHZhciBvcHRpb25zID0ge1xyXG4gICAgICAgICAgICAgIHVybDogc2NvcGUudXJsLFxyXG4gICAgICAgICAgICAgIGRhdGE6IHtcclxuICAgICAgICAgICAgICAgIGZpbGU6IHt9LFxyXG4gICAgICAgICAgICAgICAgZXZlbnRJZDoge30sXHJcbiAgICAgICAgICAgICAgICB1c2VySWQ6IHt9LFxyXG4gICAgICAgICAgICAgICAgcHJpb3JpdHk6IHNjb3BlLmZvcm0uc2NoZW1hLnByaW9yaXR5XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9O1xyXG5cclxuICAgICAgICAgICAgb3B0aW9ucy5kYXRhW3Njb3BlLmZvcm0uZmlsZU5hbWUgfHwgJ2ZpbGUnXSA9IGZpbGU7XHJcbiAgICAgICAgICAgIG9wdGlvbnMuZGF0YVsnZXZlbnRJZCddID0gc3VibWlzc2lvblNlcnZpY2UuZ2V0UmVwb3J0VHlwZSgpLnJlcG9ydFR5cGUudmFsdWU7XHJcbiAgICAgICAgICAgIG9wdGlvbnMuZGF0YVsndXNlcklkJ10gPSBzdWJtaXNzaW9uU2VydmljZS5nZXRVc2VySWQoKTtcclxuICAgICAgICAgICAgZmlsZS51cGxvYWQgPSBVcGxvYWQudXBsb2FkKG9wdGlvbnMpO1xyXG5cclxuICAgICAgICAgICAgZmlsZS51cGxvYWQudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcclxuICAgICAgICAgICAgICAkdGltZW91dChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICBmaWxlLnJlc3VsdCA9IHJlc3BvbnNlLmRhdGEubWVzc2FnZTtcclxuICAgICAgICAgICAgICAgIGZpbGUudXVpZCA9IHJlc3BvbnNlLmRhdGEuZmlsZVswXS51dWlkO1xyXG4gICAgICAgICAgICAgICAgZmlsZS51cGxvYWRDb21wbGV0ZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgZmlsZS5wcm9ncmVzcyA9IDEwMDtcclxuICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAvL2ZpbGVSZXN1bHQgPSByZXNwb25zZS5kYXRhLmZpbGU7XHJcbiAgICAgICAgICAgICAgX21lcmdlRGF0YVRvTmdNb2RlbFZhbHVlKHJlc3BvbnNlLmRhdGEuZmlsZVswXSk7XHJcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChyZXNwb25zZSkge1xyXG4gICAgICAgICAgICAgIGlmIChyZXNwb25zZS5zdGF0dXMgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICBmaWxlLmVycm9yTXNnID0gcmVzcG9uc2Uuc3RhdHVzICsgJzogJyArIHJlc3BvbnNlLmRhdGEubWVzc2FnZTtcclxuICAgICAgICAgICAgICB9IGVsc2UgaWYgKHJlc3BvbnNlLnN0YXR1cyA9PSAtMSkge1xyXG4gICAgICAgICAgICAgICAgZmlsZS5lcnJvck1zZyA9IFwiRXJyb3I6IHRyb3VibGUgY29ubmVjdGluZyB0byB0aGUgc2VydmVyLCBwbGVhc2UgdmVyaWZ5IHlvdSBoYXZlIGludGVybmV0IGFjY2Vzcy5cIjtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAvLyAudGhlbihmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIC8vICAgaWYgKGZpbGVSZXN1bHQgJiYgZmlsZVJlc3VsdCAhPSBudWxsICYmIGZpbGVSZXN1bHQuZmlsZSlcclxuICAgICAgICAgICAgLy8gICAgIGZpbGVTZXJ2aWNlLnNldEZpbGUoZmlsZVJlc3VsdC5maWxlWzBdKTtcclxuICAgICAgICAgICAgLy8gfSk7XHJcblxyXG4gICAgICAgICAgICBmaWxlLnVwbG9hZC5wcm9ncmVzcyhmdW5jdGlvbiAoZXZ0KSB7XHJcbiAgICAgICAgICAgICAgZmlsZS5wcm9ncmVzcyA9IE1hdGgubWluKDEwMCwgcGFyc2VJbnQoMTAwLjAgKlxyXG4gICAgICAgICAgICAgICAgZXZ0LmxvYWRlZCAvIGV2dC50b3RhbCkpO1xyXG4gICAgICAgICAgICAgIGlmIChmaWxlLnByb2dyZXNzID09IDEwMCAmJiAhZmlsZS51cGxvYWRDb21wbGV0ZWQpIHtcclxuICAgICAgICAgICAgICAgIC8vYmVjYXVzZSB3ZSBuZWVkIHRoZSByZXNwb25zZSB0byByZXR1cm4sIHdlIGFyZW4ndCB0cnVlbHkgYXQgMTAwJSBjb21wbGV0ZSwgdW50aWwgdGhlIHJlcG9uc2UgaXMgcmV0dXJuZWQuIG5nLWZpbGUtdXBsb2FkIHNheXMgd2UncmUgYXQgMTAwJSB3aGVuIHRoZSBmaWxlIGlzIHNlbnQgdG8gdGhlIHNlcnZlci5cclxuICAgICAgICAgICAgICAgIGZpbGUucHJvZ3Jlc3MgPSA5OTtcclxuICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZnVuY3Rpb24gX2NsZWFyRXJyb3JNc2coKSB7XHJcbiAgICAgICAgICBkZWxldGUgc2NvcGUuZXJyb3JNc2c7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmdW5jdGlvbiBfcmVzZXRGaWVsZE5nTW9kZWwoaXNBcnJheSkge1xyXG4gICAgICAgICAgaWYgKGlzQXJyYXkpIHtcclxuICAgICAgICAgICAgbmdNb2RlbC4kc2V0Vmlld1ZhbHVlKFtdKTtcclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIG5nTW9kZWwuJHNldFZpZXdWYWx1ZSgpO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgbmdNb2RlbC4kY29tbWl0Vmlld1ZhbHVlKCk7XHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgLy8gVGhpcyBpcyB0aGUgbmdNb2RlbCBvZiB0aGUgXCJmaWxlXCIgaW5wdXQsIGluc3RlYWQgb2YgdGhlIG5nTW9kZWwgb2YgdGhlIHdob2xlIGZvcm1cclxuICAgICAgICBmdW5jdGlvbiBfcmVzZXRGaWxlTmdNb2RlbCgpIHtcclxuICAgICAgICAgIHZhciBmaWxlTmdNb2RlbCA9IHNjb3BlLnVwbG9hZEZvcm0uZmlsZTtcclxuICAgICAgICAgIGZpbGVOZ01vZGVsLiRzZXRWaWV3VmFsdWUoKTtcclxuICAgICAgICAgIGZpbGVOZ01vZGVsLiRjb21taXRWaWV3VmFsdWUoKTtcclxuICAgICAgICAgIGRlbGV0ZSBzY29wZS5waWNGaWxlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gVGhpcyBpcyB0aGUgbmdNb2RlbCBvZiB0aGUgXCJmaWxlXCIgaW5wdXQsIGluc3RlYWQgb2YgdGhlIG5nTW9kZWwgb2YgdGhlIHdob2xlIGZvcm1cclxuICAgICAgICBmdW5jdGlvbiBfcmVzZXRGaWxlc05nTW9kZWwoaW5kZXgpIHtcclxuICAgICAgICAgIHZhciBmaWxlTmdNb2RlbCA9IHNjb3BlLnVwbG9hZEZvcm0uZmlsZXM7XHJcbiAgICAgICAgICBpZiAoc2NvcGUucGljRmlsZXMubGVuZ3RoID09PSAxKSB7XHJcbiAgICAgICAgICAgIGZpbGVOZ01vZGVsLiRzZXRWaWV3VmFsdWUoKTtcclxuICAgICAgICAgICAgZGVsZXRlIHNjb3BlLnBpY0ZpbGVzO1xyXG4gICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgc2NvcGUucGljRmlsZXMuc3BsaWNlKGluZGV4LCAxKTtcclxuICAgICAgICAgICAgZmlsZU5nTW9kZWwuJHNldFZpZXdWYWx1ZShzY29wZS5waWNGaWxlcyk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBmaWxlTmdNb2RlbC4kY29tbWl0Vmlld1ZhbHVlKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzY29wZS5yZW1vdmVJbnZhbGlkRmlsZSA9IGZ1bmN0aW9uIChpbnZhbGlkRmlsZSwgaW5kZXgpIHtcclxuICAgICAgICAgIGlmIChzY29wZS5pc1NpbmdsZWZpbGVVcGxvYWQpIHtcclxuICAgICAgICAgICAgZGVsZXRlIHNjb3BlLmludmFsaWRGaWxlO1xyXG4gICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgc2NvcGUuaW52YWxpZEZpbGVzLnNwbGljZShpbmRleCwgMSk7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgc2NvcGUucmVtb3ZlRmlsZSA9IGZ1bmN0aW9uIChmaWxlLCBpbmRleCkge1xyXG4gICAgICAgICAgaWYgKHNjb3BlLmlzU2luZ2xlZmlsZVVwbG9hZCkge1xyXG4gICAgICAgICAgICBpZiAoZmlsZSAmJiBmaWxlLnV1aWQpXHJcbiAgICAgICAgICAgICAgc2NvcGUuZmlsZVNlcnZpY2UuZGVsZXRlRmlsZShmaWxlLnV1aWQpO1xyXG5cclxuICAgICAgICAgICAgX2NsZWFyRXJyb3JNc2coKTtcclxuICAgICAgICAgICAgX3Jlc2V0RmllbGROZ01vZGVsKHRydWUpO1xyXG4gICAgICAgICAgICBfcmVzZXRGaWxlTmdNb2RlbCgpO1xyXG5cclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGlmIChmaWxlICYmIGZpbGUudXVpZClcclxuICAgICAgICAgICAgICBzY29wZS5maWxlU2VydmljZS5kZWxldGVGaWxlKGZpbGUudXVpZCk7XHJcblxyXG4gICAgICAgICAgICBfY2xlYXJFcnJvck1zZygpO1xyXG4gICAgICAgICAgICBfcmVzZXRGaWVsZE5nTW9kZWwodHJ1ZSk7XHJcbiAgICAgICAgICAgIF9yZXNldEZpbGVzTmdNb2RlbChpbmRleCk7XHJcblxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHNjb3BlLnZhbGlkYXRlRmllbGQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICBpZiAoc2NvcGUudXBsb2FkRm9ybS5maWxlICYmIHNjb3BlLnVwbG9hZEZvcm0uZmlsZS4kdmFsaWQgJiYgc2NvcGUucGljRmlsZSAmJiAhc2NvcGUucGljRmlsZS4kZXJyb3IpIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coJ3NpbmdsZWZpbGUtZm9ybSBpcyBpbnZhbGlkJyk7XHJcbiAgICAgICAgICB9IGVsc2UgaWYgKHNjb3BlLnVwbG9hZEZvcm0uZmlsZXMgJiYgc2NvcGUudXBsb2FkRm9ybS5maWxlcy4kdmFsaWQgJiYgc2NvcGUucGljRmlsZXMgJiYgIXNjb3BlLnBpY0ZpbGVzLiRlcnJvcikge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZygnbXVsdGlmaWxlLWZvcm0gaXMgIGludmFsaWQnKTtcclxuICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdzaW5nbGUtIGFuZCBtdWx0aWZpbGUtZm9ybSBhcmUgdmFsaWQnKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBzY29wZS5zdWJtaXQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICBpZiAoc2NvcGUudXBsb2FkRm9ybS5maWxlICYmIHNjb3BlLnVwbG9hZEZvcm0uZmlsZS4kdmFsaWQgJiYgc2NvcGUucGljRmlsZSAmJiAhc2NvcGUucGljRmlsZS4kZXJyb3IpIHtcclxuICAgICAgICAgICAgc2NvcGUudXBsb2FkRmlsZShzY29wZS5waWNGaWxlKTtcclxuICAgICAgICAgIH0gZWxzZSBpZiAoc2NvcGUudXBsb2FkRm9ybS5maWxlcyAmJiBzY29wZS51cGxvYWRGb3JtLmZpbGVzLiR2YWxpZCAmJiBzY29wZS5waWNGaWxlcyAmJiAhc2NvcGUucGljRmlsZXMuJGVycm9yKSB7XHJcbiAgICAgICAgICAgIHNjb3BlLnVwbG9hZEZpbGVzKHNjb3BlLnBpY0ZpbGVzKTtcclxuICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBzY29wZS4kb24oJ3NjaGVtYUZvcm1WYWxpZGF0ZScsIHNjb3BlLnZhbGlkYXRlRmllbGQpO1xyXG4gICAgICAgIHNjb3BlLiRvbignc2NoZW1hRm9ybUZpbGVVcGxvYWRTdWJtaXQnLCBzY29wZS5zdWJtaXQpO1xyXG5cclxuICAgICAgICBzY29wZS5pbnRlcnBWYWxpZGF0aW9uTWVzc2FnZSA9IGZ1bmN0aW9uIGludGVycFZhbGlkYXRpb25NZXNzYWdlKGVycm9yVHlwZSwgaW52YWxpZEZpbGUpIHtcclxuICAgICAgICAgIGlmICghaW52YWxpZEZpbGUpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIHZhciBlcnJvciA9IGVycm9yVHlwZTsgLy9pbnZhbGlkRmlsZS4kZXJyb3I7IC8vIGUuZy4sICdtYXhTaXplJ1xyXG4gICAgICAgICAgdmFyIGZvcm0gPSBzY29wZS5mb3JtO1xyXG4gICAgICAgICAgdmFyIHZhbGlkYXRpb25NZXNzYWdlID0gZm9ybSAmJiBmb3JtLnNjaGVtYSA/IGZvcm0udmFsaWRhdGlvbk1lc3NhZ2UgOiBmb3JtLnNjaGVtYS52YWxpZGF0aW9uTWVzc2FnZSA/IGZvcm0uc2NoZW1hLnZhbGlkYXRpb25NZXNzYWdlIDogdW5kZWZpbmVkO1xyXG4gICAgICAgICAgdmFyIG1lc3NhZ2U7XHJcbiAgICAgICAgICBpZiAoYW5ndWxhci5pc1N0cmluZyh2YWxpZGF0aW9uTWVzc2FnZSkpIHtcclxuICAgICAgICAgICAgbWVzc2FnZSA9IHZhbGlkYXRpb25NZXNzYWdlO1xyXG4gICAgICAgICAgfSBlbHNlIGlmIChhbmd1bGFyLmlzT2JqZWN0KHZhbGlkYXRpb25NZXNzYWdlKSkge1xyXG4gICAgICAgICAgICBtZXNzYWdlID0gdmFsaWRhdGlvbk1lc3NhZ2VbZXJyb3JdO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIGlmICghbWVzc2FnZSkge1xyXG4gICAgICAgICAgICByZXR1cm4gZXJyb3I7XHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgdmFyIGNvbnRleHQgPSB7XHJcbiAgICAgICAgICAgIGVycm9yOiBlcnJvcixcclxuICAgICAgICAgICAgZmlsZTogaW52YWxpZEZpbGUsXHJcbiAgICAgICAgICAgIGZvcm06IGZvcm0sXHJcbiAgICAgICAgICAgIHNjaGVtYTogZm9ybS5zY2hlbWEsXHJcbiAgICAgICAgICAgIHRpdGxlOiBmb3JtLnRpdGxlIHx8IChmb3JtLnNjaGVtYSAmJiBmb3JtLnNjaGVtYS50aXRsZSlcclxuICAgICAgICAgIH07XHJcbiAgICAgICAgICB2YXIgaW50ZXJwb2xhdGVkTWVzc2FnZSA9ICRpbnRlcnBvbGF0ZShtZXNzYWdlKShjb250ZXh0KTtcclxuXHJcbiAgICAgICAgICByZXR1cm4gJHRyYW5zbGF0ZS5pbnN0YW50KGludGVycG9sYXRlZE1lc3NhZ2UpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICB9XHJcbiAgICB9O1xyXG4gIH1dKTsiLG51bGxdfQ==
