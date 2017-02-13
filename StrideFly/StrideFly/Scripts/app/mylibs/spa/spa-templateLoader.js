define(["jQuery"], function ($) {

    return {

        loadExtTemplate: function (name, path) {

            $.ajax({
                async: false,
                url: path,
                cache: false,
                success: function (result) {
                    $("body").append(result);
                },
                error: function (result) {
                    alert("Error Loading View/Template");
                }
            });
        }
    }
});