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
        DZ.login(signInCallback, {perms: 'basic_access,manage_library'});
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
        this.trackNumer = tags.track;
        this.genre = tags.genre;
        this.year = tags.year;
    }

    function displayMP3(mp3) {
        var $mp3Row = $('<tr>');

        var $matchIcon = $('<span>');
        $matchIcon.addClass('glyphicon glyphicon-remove');
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
            if ($(this).hasClass('table-info')) {
                return;
            }
            $('#result-list').empty();
            requestResults(mp3, $matchIcon);
            $('.table-info').removeClass('table-info');
            $mp3Row.addClass('table-info');
        });

        $('#mp3-list').append($mp3Row);
    }

    function updateProgress() {
        var total = $('#file-input')[0].files.length;
        if (filesRead === total) {
            $('#loading-animation').css('visibility', 'hidden');
        }
    }

    // Search for relevant songs
    function requestResults(mp3, $matchIcon) {
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
        DZ.api('/search', 'GET', {q: query}, createResultCallback($matchIcon));
    }

    function createResultCallback($matchIcon) {
        return function (response) {
            var results = response.data;
            for (var resultID = 0; resultID < results.length; resultID++) {
                var result = results[resultID];
                var song = new Song(result);
                displaySong(song, $matchIcon);
            }
        }
    }

    function Song(result) {
        this.ID = result.id;
        this.artist = result.artist.name;
        this.title = result.title;
        this.album = result.album.title;
        this.duration = result.duration;
        this.preview = result.preview;
        // this.trackNumber = result.track_position;
    }

    // Display search results
    function displaySong(song, $matchIcon) {
        var $resultRow = $('<tr>');

        var $likeIcon = $('<span>');
        $likeIcon.addClass('match-icon glyphicon glyphicon-heart-empty');
        var $likeButton = $('<button>');
        $likeButton.addClass('btn btn-default match-icon-button');
        $likeButton.append($likeIcon);
        $likeButton.click(createLikeFunction(song.ID, $matchIcon, $likeIcon));
        var $likeCell = $('<td>');
        $likeCell.append($likeButton);
        $resultRow.append($likeCell);

        var $artist = $('<td>');
        $artist.text(song.artist);
        $resultRow.append($artist);

        var $title = $('<td>');
        $title.text(song.title);
        $resultRow.append($title);

        var $album = $('<td>');
        $album.text(song.album);
        $resultRow.append($album);

        var $source = $('<source type="audio/mpeg"/>');
        $source.attr('src', song.preview);
        var $audio = $('<audio controls="controls"></audio>');
        $audio.append($source);
        var $playback = $('<td></td>');
        $playback.append($audio);
        $resultRow.append($playback);

        var minutes = Math.floor(song.duration / 60);
        var seconds = song.duration % 60;
        var $duration = $('<td></td>');
        $duration.text(minutes + ':' + seconds);
        $resultRow.append($duration);

        $('#result-list').append($resultRow);
    }

    function createLikeFunction(songID, $matchIcon, $likeIcon) {
        return function () {
            if ($matchIcon.hasClass('glyphicon-ok')) {
                DZ.api('/user/me/tracks', 'DELETE', {track_id: songID}, createLikeCallback($matchIcon, $likeIcon));
            } else {
                DZ.api('/user/me/tracks', 'POST', {track_id: songID}, createLikeCallback($matchIcon, $likeIcon));
            }
        }
    }

    function createLikeCallback($matchIcon, $likeIcon) {
        return function (response) {
            $matchIcon.removeClass('glyphicon-remove');
            $matchIcon.addClass('glyphicon-ok');
            $likeIcon.removeClass('glyphicon-heart-empty');
            $likeIcon.addClass('glyphicon-heart');
        };
    }
});
