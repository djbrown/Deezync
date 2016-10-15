/*
 Copyright 2016 Daniel Brown.
 All rights reserved.
 */
$(function () {
    // Initialize DZ SDK
    DZ.init({
        appId: '193362',
        channelUrl: 'http://deezync.djbrown.de/channel.php'
    });

    // Check of user is already signed in
    DZ.getLoginStatus(signInCallback);

    // Sign in
    $('#button-sign-in').click(signIn);

    function signIn() {
        DZ.login(signInCallback, {perms: 'basic_access,manage_library,delete_library'});
    }

    function signInCallback(response) {
        if (response.authResponse && response.status === 'connected') {
            DZ.api('/user/me', userCallback);
            $('#nav-signed-out').hide();
            $('#nav-signed-in').show();
        }
        else signOut();
    }

    var user;

    function userCallback(response) {
        user = response;
        var $userProfileLink = $('#user-profile-link');
        $userProfileLink.attr('href', user.link);
        $userProfileLink.text(user.name);
        $('#user-profile-image').attr('src', user.picture_small);
    }


    // Sign out
    $('#button-sign-out').click(signOut);

    function signOut() {
        DZ.logout(signOutCallback);
    }

    function signOutCallback() {
        var $userProfileLink = $('#user-profile-link');
        $userProfileLink.attr('href', '');
        $userProfileLink.text('');
        $('#user-profile-image').attr('src', '');
        $('#nav-signed-in').hide();
        $('#nav-signed-out').show();
    }

    // File upload
    $('#file-input').change(filesUploaded);

    var filesRead = 0;

    function filesUploaded() {
        $('#mp3-list').empty();
        $('#result-list').empty();
        $('#loading-animation').css('visibility', 'visible');

        filesRead = 0;
        var files = $('#file-input')[0].files;
        for (var fileID = 0; fileID < files.length; fileID++) {
            readFile(files[fileID]);
        }
    }

    function readFile(file) {
        jsmediatags.read(file, {
            onSuccess: function (tag) {
                var mp3 = new MP3(file, tag.tags);
                displayMP3(mp3);
                filesRead++;
                updateProgress();
            },
            onError: function (error) {
                console.error(error);
            }
        });
    }

    function MP3(file, tags) {
        this.file = file;

        this.fileName = file.name;
        this.artist = tags.artist;
        this.title = tags.title;
        this.album = tags.album;
        this.genre = tags.genre;
        this.year = tags.year;
    }

    function displayMP3(mp3) {
        var $mp3Row = $('<tr>');

        var $matchIcon = $('<span>');
        $matchIcon.addClass('match-icon glyphicon glyphicon-remove');
        var $matchIconCell = $('<td>');
        $matchIconCell.append($matchIcon);
        $mp3Row.append($matchIconCell);
        var $artist = $('<td>');

        $artist.text(mp3.artist);
        $mp3Row.append($artist);
        var $title = $('<td>');

        $title.text(mp3.title);
        $mp3Row.append($title);
        var $album = $('<td>');

        $album.text(mp3.album);
        $mp3Row.append($album);
        var $audio = $('<audio controls="controls"></audio>');

        var src = URL.createObjectURL(mp3.file);
        $audio.attr('src', src);
        var $playback = $('<td>');
        $playback.append($audio);
        $mp3Row.append($playback);
        var $fileName = $('<td>');

        $fileName.text(mp3.fileName);
        $mp3Row.append($fileName);

        $mp3Row.click(function () {
            if ($mp3Row.hasClass('current-mp3')) {
                return;
            }
            $('#result-list').empty();
            $('.current-mp3').removeClass('current-mp3');
            $mp3Row.addClass('current-mp3');
            requestResults(mp3);
        });

        $('#mp3-list').append($mp3Row);
    }

    function updateProgress() {
        var total = $('#file-input')[0].files.length;
        if (filesRead === total) {
            $('#loading-animation').css('visibility', 'hidden');
        }
    }

    // Search for matching songs
    function requestResults(mp3) {
        var query = '';
        if (mp3.artist) {
            query += ' artist:"' + mp3.artist + '"';
        }
        if (mp3.title) {
            query += ' track:"' + mp3.title + '"';
        }
        if (mp3.album) {
            query += ' album:"' + mp3.album + '"';
        }
        DZ.api('/search/track', {q: query}, resultsCallback);
    }

    function resultsCallback(response) {
        response.data.forEach(function (result) {
            displayResult(result);
        });
        updateIcons();
    }

    // Display search results
    function displayResult(result) {
        var $likeIcon = elem('span');
        $likeIcon.addClass('like-icon glyphicon glyphicon-heart-empty');
        var $likeButton = elem('button');
        $likeButton.addClass('like-button btn btn-default');
        $likeButton.attr('data-track-id', result.id);
        $likeButton.attr('data-like-action', 'like');
        $likeButton.click(likeButtonClicked);
        $likeButton.append($likeIcon);
        var $like = elem('td');
        $like.append($likeButton);

        var $artist = elem('td');
        $artist.text(result.artist.name);

        var $title = elem('td');
        $title.text(result.title);

        var $album = elem('td');
        $album.text(result.album.title);

        var $audio = elem('audio');
        $audio.attr('controls', 'controls');
        $audio.attr('src', result.preview);
        var $playback = elem('td');
        $playback.append($audio);

        var minutes = Math.floor(result.duration / 60);
        var seconds = result.duration % 60;
        var $duration = elem('td');
        $duration.text(minutes + ':' + seconds);

        var $resultRow = elem('tr');
        $resultRow.append($like);
        $resultRow.append($artist);
        $resultRow.append($title);
        $resultRow.append($album);
        $resultRow.append($playback);
        $resultRow.append($duration);

        $('#result-list').append($resultRow);
    }

    function likeButtonClicked() {
        var trackID = $(this).attr('data-track-id');
        if (!trackID) {
            return;
        }

        var likeAction = $(this).attr('data-like-action');
        var method;
        if (likeAction === 'like') {
            method = 'post';
        } else if (likeAction === 'dislike') {
            method = 'delete';
        } else {
            return;
        }

        DZ.api('/user/me/tracks', method, {track_id: trackID}, updateIcons);
    }

    function updateIcons() {
        DZ.api('/user/me/tracks?limit=2000', function (result) {
            var favorites = result.data;
            var isMatched = false;
            var $likeButtons = $('.like-button');
            $likeButtons.each(function (index, likeButton) {
                var $likeButton = $(likeButton);
                var resultID = $likeButton.attr('data-track-id');
                var isFav = isFavorite(resultID, favorites);
                var $likeIcon = $likeButton.find('.like-icon');
                setLiked(isFav, $likeIcon, $likeButton);
                isMatched = isMatched || isFav;
            });
            var $matchIcon = $('.current-mp3 .match-icon');
            setMatched(isMatched, $matchIcon);
        });
    }

    function isFavorite(resultID, favorites) {
        var isFav = false;
        favorites.forEach(function (favorite) {
            if (resultID == favorite.id) {
                return isFav = true;
            }
        });
        return isFav;
    }

    function setLiked(isLiked, $likeIcon, $likeButton) {
        if (isLiked) {
            $likeIcon.removeClass('glyphicon-heart-empty');
            $likeIcon.addClass('glyphicon-heart');
            $likeButton.attr('data-like-action', 'dislike');
        } else {
            $likeIcon.removeClass('glyphicon-heart');
            $likeIcon.addClass('glyphicon-heart-empty');
            $likeButton.attr('data-like-action', 'like');
        }
    }

    function setMatched(isMatched, $matchIcon) {
        if (isMatched) {
            $matchIcon.removeClass('glyphicon-remove');
            $matchIcon.addClass('glyphicon-ok');
        } else {
            $matchIcon.removeClass('glyphicon-ok');
            $matchIcon.addClass('glyphicon-remove');
        }
    }

    function elem(element) {
        return $(document.createElement(element));
    }

});
