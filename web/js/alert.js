/*
 Copyright 2016 Daniel Brown.
 All rights reserved.
 */
window.Alert = function () {
    function alertSuccess(message) {
        alertGeneric(message, 'success');
    }

    function alertInfo(message) {
        alertGeneric(message, 'info');
    }

    function alertWarning(message) {
        alertGeneric(message, 'warning');
    }

    function alertDanger(message) {
        alertGeneric(message, 'danger');
    }

    function alertGeneric(message, type) {
        var $alert = $('<div class="alert alert-' + type + ' alert-dismissible">' +
            '<button type="button" class="close" data-dismiss="alert" aria-label="Close"><span>&times;</span></button>' +
            message + '</div>');
        $('#alert').append($alert);
    }

    return {
        success: alertSuccess,
        info: alertInfo,
        warning: alertWarning,
        danger: alertDanger
    };
};
