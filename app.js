'use strict';

var myApp = angular.module('formApp', [
        'schemaForm',
        'pascalprecht.translate',
        'ngSchemaFormFile'
    ])
    .controller('formController', ['$scope', '$q', '$translate', function($scope, $q, $translate) {
        $translate.use('en');
        $scope.schema = {
            "type": "object",
            "title": "Album",
            "properties": {
                "image": {
                    "title": "Image (Label coming from form definition)",
                    "type": "array",
                    "format": "singlefile",
                    "x-schema-form": {
                        "type": "object"
                    },
                    "pattern": {
                        "mimeType": "image/*, !.jpg",
                        "validationMessage": "Falscher Dateityp: "
                    },
                    "maxSize": {
                        "maximum": "2b",
                        "validationMessage": "Erlaubte Dateigröße überschritten: ",
                        "validationMessage2": "Aktuelle Dateigröße: "
                    },
                    "maxItems": {
                        "validationMessage": "Es wurden mehr Dateien hochgeladen als erlaubt."
                    },
                    "minItems": {
                        "validationMessage": "Sie müssen mindestens eine Datei hochladen"
                    }
                },
                "images": {
                    "title": "Images (Labels defined using the translate module)",
                    "type": "array",
                    "format": "multifile",
                    "x-schema-form": {
                        "type": "array"
                    },
                    "pattern": {
                        "mimeType": "image/*",
                        "validationMessage": "Falscher Dateityp: "
                    },
                    "maxSize": {
                        "maximum": "2b",
                        "validationMessage": "Erlaubte Dateigröße überschritten: ",
                        "validationMessage2": "Aktuelle Dateigröße: "
                    },
                    "maxItems": {
                        "validationMessage": "Es wurden mehr Dateien hochgeladen als erlaubt."
                    },
                    "minItems": {
                        "validationMessage": "Sie müssen mindestens eine Datei hochladen"
                    }
                }
            },
            "required": [
                "images"
            ]
        };

        $scope.form = [{
            "key": "image",
            "type": "nwpFileUpload",
            "endpoint": "https://angular-file-upload-cors-srv.appspot.com/upload",
            "i18n": {
                "add": "Open file browser",
                "preview": "Preview Upload",
                "filename": "File Name",
                "progress": "Progress Status",
                "upload": "Upload",
                "dragorclick": "Drag and drop your file here or click here"
            }
        }, {
            "key": "images",
            "type": "nwpFileUpload",
            "endpoint": "https://angular-file-upload-cors-srv.appspot.com/upload"
        }];

        $scope.model = {};

        $scope.submit = function() {
            $scope.$broadcast('schemaFormValidate');
            if ($scope.myForm.$valid) {
                console.log('form valid');
            }
        };

    }])
    .config(['$translateProvider', function($translateProvider) {
        // Simply register translation table as object hash
        $translateProvider.translations('en', {
            'modules.upload.dndNotSupported': 'Drag n drop not surpported by your browser',
            'modules.attribute.fields.required.caption': 'Required',
            'modules.upload.descriptionSinglefile': 'Drop your file here',
            'modules.upload.descriptionMultifile': 'Drop your file(s) here',
            'buttons.add': 'Open file browser',
            'modules.upload.field.filename': 'Filename',
            'modules.upload.field.preview': 'Preview',
            'modules.upload.multiFileUpload': 'Multifile upload',
            'modules.upload.field.progress': 'Progress',
            'buttons.upload': 'Upload'
        }); 
        $translateProvider.translations('de', {
            'modules.upload.dndNotSupported': 'Drag & Drop nicht von Ihrem Browser übertroffen',
            'modules.attribute.fields.required.caption': 'Erforderlich',
            'modules.upload.descriptionSinglefile': 'Legen Sie Ihre Datei hier ab',
            'modules.upload.descriptionMultifile': 'Legen Sie Ihre Datei (en) hier ab',
            'buttons.add': 'Öffnen Sie den Dateibrowser',
            'modules.upload.field.filename': 'Dateiname',
            'modules.upload.field.preview': 'Vorschau',
            'modules.upload.multiFileUpload': 'Multi-Upload',
            'modules.upload.field.progress': 'PrFortschrittogress',
            'buttons.upload': 'Hochladen'
        });
        $translateProvider.preferredLanguage('en');
        $translateProvider.useSanitizeValueStrategy('sanitizeParameters');
    

    }]);