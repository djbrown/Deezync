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
    var $fileInput = $('#file-input');
    var fileInput = $fileInput[0];
    $fileInput.change(fileInputChanged);

    var $mp3List = $('#mp3-list');
    var $resultList = $('#result-list');
    var $loadingAnimation = $('#loading-animation');

    var mp3s;
    var currentMP3Index;

    function fileInputChanged() {
        $fileInput.attr('disabled', 'disabled');
        $loadingAnimation.css('visibility', 'visible');
        mp3s = [];
        currentMP3Index = -1;
        $mp3List.empty();
        $resultList.empty();
        var files = fileInput.files;
        for (var fileID = 0; fileID < files.length; fileID++) {
            readFile(files[fileID]);
        }
        updateProgress();
    }

    function readFile(file) {
        jsmediatags.read(file, {
            onSuccess: function (tag) {
                var mp3 = new MP3(file, tag.tags);
                mp3s.push(mp3);
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
        this.results = [];
        this.matches = [];
    }

    function updateProgress() {
        var total = fileInput.files.length;
        if (mp3s.length === total) {
            $('#loading-animation').css('visibility', 'hidden');
            $fileInput.removeAttr('disabled');
            $(mp3s).each(displayMP3);
            updateMatches();
        }
    }

    function displayMP3(mp3Index, mp3) {
        var $mp3Row = elem('tr');
        $mp3Row.addClass('mp3-row');
        $mp3Row.attr('data-mp3-id', mp3Index);

        var $matchIcon = elem('span');
        $matchIcon.addClass('match-icon glyphicon glyphicon-remove');

        var $matchButton = elem('button');
        $matchButton.attr('type', 'button');
        $matchButton.attr('data-toggle', 'modal');
        $matchButton.attr('data-target', '#result-modal');
        $matchButton.addClass('btn btn-primary');
        $matchButton.append($matchIcon);

        var $match = elem('td');
        $match.append($matchButton);
        $mp3Row.append($match);

        var $fileName = elem('td');
        $fileName.text(mp3.fileName);
        $mp3Row.append($fileName);

        var $artist = elem('td');
        $artist.text(mp3.artist);
        $mp3Row.append($artist);

        var $title = elem('td');
        $title.text(mp3.title);
        $mp3Row.append($title);

        var $album = elem('td');
        $album.text(mp3.album);
        $mp3Row.append($album);

        var $audio = elem('audio');
        $audio.attr('controls', 'controls');
        var src = URL.createObjectURL(mp3.file);
        $audio.attr('src', src);
        var $playback = elem('td');
        $playback.append($audio);
        $mp3Row.append($playback);

        $('#mp3-list').append($mp3Row);
    }

    var $resultModal = $('#result-modal');
    $resultModal.on('show.bs.modal', function (e) {
        var $mp3Row = $(e.relatedTarget).closest('.mp3-row');
        currentMP3Index = $mp3Row.attr('data-mp3-id');
        $('.current-mp3-row').removeClass('current-mp3-row');
        $('[data-mp3-id="' + currentMP3Index + '"').addClass('current-mp3-row');
        updateMatches();
        setTimeout(function () {
            $(".modal-backdrop").addClass("modal-backdrop-fullscreen");
        }, 0);
    });
    $resultModal.on('hidden.bs.modal', function () {
        $(".modal-backdrop").addClass("modal-backdrop-fullscreen");
        $resultList.empty();
    });

    function updateMatches() {
        $resultList.empty();
        DZ.api('/user/me/tracks?limit=2000', function (response) {
            var favorites = response.data;
            $('.mp3-row').each(function () {
                var $mp3Row = $(this);
                var mp3Index = $mp3Row.attr('data-mp3-id');
                var mp3 = mp3s[mp3Index];

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
                DZ.api('/search/track', {q: query}, function (response) {
                    mp3.results = new Map();
                    mp3.matches = new Map();
                    if (!response.data) {
                        console.log(response);
                    }
                    response.data.forEach(function (result) {
                        var resultID = result.id;
                        mp3.results.set(resultID, result);
                        var isLiked = isFavorite(resultID, favorites);
                        if (isLiked) {
                            mp3.matches.set(resultID, result);
                        }
                        if (currentMP3Index === mp3Index) {
                            var $resultRow = displayResult(result);
                            setLiked(isLiked, $resultRow)
                        }
                    });
                    var isMatched = mp3.matches.size !== 0;
                    setMatched(isMatched, $mp3Row);
                });
            });
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

    function setMatched(isMatched, $mp3Row) {
        var $matchIcon = $mp3Row.find('.match-icon');
        if (isMatched) {
            $matchIcon.removeClass('glyphicon-remove');
            $matchIcon.addClass('glyphicon-ok');
        } else {
            $matchIcon.removeClass('glyphicon-ok');
            $matchIcon.addClass('glyphicon-remove');
        }
    }

    // Display search results
    function displayResult(result) {
        var $resultRow = elem('tr');
        $('#result-list').append($resultRow);

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
        $resultRow.append($like);

        var $artist = elem('td');
        $artist.text(result.artist.name);
        $resultRow.append($artist);

        var $title = elem('td');
        $title.text(result.title);
        $resultRow.append($title);

        var $album = elem('td');
        $album.text(result.album.title);
        $resultRow.append($album);

        var $audio = elem('audio');
        $audio.attr('controls', 'controls');
        $audio.attr('src', result.preview);
        var $playback = elem('td');
        $playback.append($audio);
        $resultRow.append($playback);

        var minutes = Math.floor(result.duration / 60);
        var seconds = result.duration % 60;
        var $duration = elem('td');
        $duration.text(minutes + ':' + seconds);
        $resultRow.append($duration);

        return $resultRow;
    }

    function setLiked(isLiked, $resultRow) {
        var $likeButton = $resultRow.find('.like-button');
        var $likeIcon = $resultRow.find('.like-icon');
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

        DZ.api('/user/me/tracks', method, {track_id: trackID}, updateMatches);
    }

    function elem(element) {
        return $(document.createElement(element));
    }

})
;
