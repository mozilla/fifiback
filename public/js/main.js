//TODO
//1. fix 3 locations of settings - autoset, config.json, main.js

require(['jquery', 'socket.io', 'base/find', 'base/autoset', 'base/utils',
    'base/geo', 'settings', 'nunjucks', 'templates', 'moment'],
    function ($, io, find, Autoset, utils, geo, settings, nunjucks, templates, moment) {
        'use strict';

        /*********************************************************/
        /* Settings */
        /*********************************************************/
        var twitterResultsLimit = 10;
        var nytimesArticleDescriptionLength = 115;
        var bingNewsStringLength = 115;

        /*********************************************************/
        /* Polyfills */
        /*********************************************************/

        //String.contains polyfill for chrome / safari
        if (!('contains' in String.prototype)) {
            String.prototype.contains = function (str, startIndex) {
                return ''.indexOf.call(this, str, startIndex) !== -1;
            };
        }

        //toSimpleISOString polyfill
        if (!Date.prototype.toSimpleISOString) {

            ( function () {

                function pad(number) {
                    var r = String(number);
                    if (r.length === 1) {
                        r = '0' + r;
                    }
                    return r;
                }

                Date.prototype.toSimpleISOString = function () {
                    return this.getUTCFullYear()
                        + '-' + pad(this.getUTCMonth() + 1)
                        + '-' + pad(this.getUTCDate())
                        + 'T' + pad(this.getUTCHours())
                        + ':' + pad(this.getUTCMinutes())
                        + ':' + pad(this.getUTCSeconds())
                        + 'Z';
                };

            }());
        }

        String.prototype.elide = String.prototype.elide ||
            function(n){
                return this.length>n ? this.substr(0,n-1)+'&hellip;' : this;
            };

        /*********************************************************/
        /* End Polyfills */
        /*********************************************************/


        /*********************************************************/
        /* Local Storage to store search preferences */
        /*********************************************************/
        var host = location.hostname;
        var myLocalStorage = localStorage; // firefox 3.5+
        var localStoragePrefsString = "fifiSearchPreferences";

        var fifiSearchPreferences = {
            "web": {
                "bing.com": true,
                "twitter.com": true,
                "wikipedia.infobox": true,
                "boxfish.com": true
            },
            "news": {
                "bing.news": true,
                "twitter.com": true,
                "wikipedia.infobox": true,
                "boxfish.com": true,
                "nytimes.article": true
            },
            "food": {
                "bing.com": true,
                "yelp.com": true,
                "twitter.com": true,
                "foursquare.com": true
            },
            "local": {
                "bing.com": true,
                "twitter.com": true,
                "yelp.com": true,
                "foursquare.com": true
            },
            "apps": {
                "bing.com": true,
                "twitter.com": true,
                "firefox.marketplace": true
            }
        }

        //check for pre-existing prefs
        if (localStorage.getItem(localStoragePrefsString) != null) {
            console.log("found existing preferences")
            fifiSearchPreferences = JSON.parse(myLocalStorage.getItem(localStoragePrefsString));

            $(document).ready(function () {
                //go through the stored settings, find the disabled search providers and add providerInactive css class (once the DOM is ready of course)
                for (var searchCat in fifiSearchPreferences) {
                    for (var provider in fifiSearchPreferences[searchCat]) {
                        //get the boolean state for the search provider (turned on or off)
                        var state = fifiSearchPreferences[searchCat][provider];
                        if (!state) {
                            //the provider was disabled by the user, update the CSS
                            var dataAttrs = "[data-category='" + searchCat + "'][data-provider='" + provider + "']";
                            $(dataAttrs).hide();
                        }
                    }
                }
            });
        }

        function saveFifiSearchPreferences() {
            myLocalStorage.setItem(localStoragePrefsString, JSON.stringify(fifiSearchPreferences));

            console.log(JSON.parse(myLocalStorage.getItem(localStoragePrefsString)));
        }

        function toggleProviderStatus(category, provider) {
            //invert whatever boolean value we previously had
            fifiSearchPreferences[category][provider] = !fifiSearchPreferences[category][provider];

            saveFifiSearchPreferences();
        }

//        function writeLocal() {
//            var data = $('text').value;
//            var itemName = $('item_name').value;
//            myLocalStorage.setItem(itemName, data);
//            updateItemsList();
//        }
//
//        function deleteLocal(itemName) {
//            myLocalStorage.removeItem(itemName);
//            updateItemsList();
//        }
//
//        function readLocal(itemName) {
//            $('item_name').value=itemName;
//            $('text').value=myLocalStorage.getItem(itemName);
//        }
        /*********************************************************/
        /* end Local Storage                                     */
        /*********************************************************/

        var find = $("#fifi-find");
        var gridwrapper = $("#grid-wrapper");
        var gridwrapper_columns = $("#grid-wrapper #columns");
        var suggestions = $("#suggestions");

        var inResults = false;
        var socketUrl = settings.SOCKET_URL;
        var socket = io.connect(socketUrl);
        var lastTerm;

        var autoset = new Autoset();

        nunjucks.configure('/templates', { autoescape: true });

//        function toggleVizIcon() {
//            if (searchCategory === "news") {
//                $("#viz-icon").show();
//            } else {
//                $("#viz-icon").hide();
//            }
//        }

        /* search category buttons */
        var searchCategory = "web";
        var searchCategories = ["web", "news", "food", "local", "apps"];


        //toggle what search categories will show based on the category buttons at top of screen
        $(document).ready(function () {
            //handle the reload case where the button is set from the previous page load
            //TODO this is hacky and too dependent on the DOM. Hell, all this code is. We really need
            // to go MVC when we re-write this
            searchCategory = $("input:radio:checked").data('category');
            console.log("searchCategory at start: " + searchCategory);

            $("#search-category label input").click(function (event) {
                searchCategory = $(event.currentTarget).data().category;
                console.log("changed search category: " + searchCategory);
                $("." + searchCategory).show();

                //hide the other search providers on the left
                searchCategories.forEach(function (value) {
                    if (value != searchCategory) {
                        $("." + value).hide();
                    }
                });
            });
        });

        // Listen for data from server and convert to module events
        socket.on('api/suggestDone', function (data) {
            console.log('GOT api/suggestDone: ', data);
            socket.emit('api/suggestDone/' + data.engineId, data);

            var results = data.result;
            var value = find.val().toString();

            if (!!results) {
                if (data.secondary) {
                    if (value === data.originalTerm) {
                        autoset.generateSecondary(value, results, data.engineId, searchCategory, function () {
                            nunjucks.render('results_secondary.html', {
                                engineSet: autoset.engines[searchCategory],
                                found: utils.keySize(autoset.engines[searchCategory]),
                                term: data.term
                            }, function (err, res) {
                                if (err) console.error(err);
                                else $('.suggestions-secondary').html(res);
                            });
                        });
                    }
                } else {
                    if (value === data.term) {
                        autoset.generate(value, results, data.engineId, searchCategory, function () {
                            nunjucks.render('results.html', {
                                engineSet: autoset.engines[searchCategory],
                                found: utils.keySize(autoset.engines[searchCategory])
                            }, function (err, res) {
                                if (err) {
                                    console.error(err);
                                }
                                else $('.suggestions').html(res);
                            });
                        });
                    }
                }
            }
        });

        socket.on('api/suggestImageDone', function (data) {
            console.log('GOT api/suggestImageDone: ', data.term);

            if (data.result.items && data.result.items[0].pagemap.cse_image) {
                $('.suggestions li[data-term="' + data.term + '"]')
                    .css('background-image',
                        'url(' + data.result.items[0].pagemap.cse_image[0].src + ')');
            }
        });

        socket.on('api/queryDone', function (data) {
            console.log('GOT api/queryDone: ', data);

            nunjucks.render('result.html', {
                engineId: data.engineId
            }, function (err, res) {
                if (err) {
                    console.error(err);
                    return;
                }

                //open the left menu to show search providers
                openLeftMenu();

                // ignore the wikipedia entry for now
                if (data.engineId !== 'en.wikipedia.org') {
                    $('#details-list').append(res);
                }

                var defList = $('#definition-links');
                var defVideos = $('#definition-videos');

                switch (data.engineId) {
                    case 'boxfish.com':
                        //parse out the channels that boxfish is returning related to these keywords
                        if (data.result) {
                            if (data.result.channels) {
                                data.result.channels.forEach(function (item, index, list) {
                                    gridwrapper_columns.append(
                                        $('<div data-cardtype="boxfish.com" class="card"/>').append(
                                            $('<img src="images/boxfish-favicon.png"/><a class="result-title"/>').html("TV Channel: " + item.name).attr('href', item.Url),
                                            $('<p class="result-snippet"/>').html(item.number)
                                        )
                                    )
                                });
                            }

                            if (data.result.mentions) {
                                data.result.mentions.forEach(function (item, index, list) {
                                    gridwrapper_columns.append(
                                        $('<div data-cardtype="boxfish.com" class="card"/>').append(
//                                            "<p>Mentioned on ...</p>",
                                            $('<img src="images/boxfish-favicon.png"/><a class="result-title"/>').html("TV Transcript: " + item.program.name).attr('href', item.Url),
                                            $('<p class="result-snippet"/>').html(item.text)
                                        )
                                    )
                                });
                            }

                            if (data.result.programs) {
                                data.result.programs.forEach(function (item, index, list) {
                                    gridwrapper_columns.append(
                                        $('<div data-cardtype="boxfish.com" class="card"/>').append(
                                            $('<img src="images/boxfish-favicon.png"/><a class="result-title"/>').html("TV Program: " + item.name).attr('href', item.Url),
                                            $('<p class="result-snippet"/>').html(item.description)
                                        )
                                    )
                                });
                            }
                        }
                        break;

                    case 'bing.news':
                        var json = $.parseJSON(data.result);
                        var list = json.d.results;

                        if (list) {
                            list.forEach(function (item, index, list) {
                                gridwrapper_columns.append(
                                    $('<div data-cardtype="bing.news" class="card"/>').append(
                                        $('<img src="images/bing-favicon.png"/><a class="result-title"/>').html(item.Source + " - " + item.Title).attr('href', item.Url),
//                                        $('<p class="result-snippet"/>').html(item.Date),
                                        $('<p class="result-snippet"/>').html(item.Description.elide(bingNewsStringLength))
                                    )
                                );
                            });
                        }
                        break;

                    case 'bing.com':
                        var json = $.parseJSON(data.result);
                        var list = json.d.results;

                        if (list) {
                            list.forEach(function (item, index, list) {
                                gridwrapper_columns.append(
                                    $('<div data-cardtype="bing.com" class="card"/>').append(
                                        $('<img src="images/bing-favicon.png"/><a class="result-title"/>').html(item.Title).attr('href', item.Url),
                                        $('<p class="result-snippet"/>').html(item.Description)
                                    )
                                );
                            });



                            //************** this is just for experimenting with the look of ads, it's not real ***************
                            //inject fake ad card for testing
                            gridwrapper_columns.append(
                                $('<div data-cardtype="bing.com" class="card"/>').append(
                                    $('<img src="images/bing-favicon.png"/><a class="result-title" style="background-color: yellow;" src="https://www.facebook.com/Cheetos">Hungry? Try Flaming Hot Cheetos</a>'),
                                    $('<p class="result-snippet">Yum Yum</p>')
                                )
                            );

//                            if(!window.hasColumnsLayout) {
//                                window.hasColumnsLayout = true;
//                                $(".fifi-results").columnize();
//                            } else {
//                                console.log("already laid out the columns")
//                            }

                            /* will re-enable later for other search categories that use bing */
//                            var itemURL = "";
//                            for (var index = 0, item; item = list[index]; index += 1) {
//                                itemURL = item.Url;
//                                if (itemURL.contains('en.wikipedia.org')) {
//                                    defList.append(
//                                        $('<li class="wikipedia icon"/>').append(
//                                            $('<a/>').text(item.Title.replace(' - Wikipedia, the free encyclopedia', '')).attr('href', item.Url)
//                                        )
//                                    );
//                                } else if (itemURL.contains('twitter.com')) {
//                                    defList.append(
//                                        $('<li class="twitter icon"/>').append(
//                                            $('<a/>').text(item.Url.replace(/http(s)?:\/\/twitter\.com\//, '')).attr('href', item.Url)
//                                        )
//                                    );
//                                    // locate a vimeo user account
//                                } else if (itemURL.contains('vimeo.com')) {
//                                    defList.append(
//                                        $('<li class="vimeo icon"/>').append(
//                                            $('<a/>').text(item.Title.replace('on Vimeo', '')).attr('href', item.Url)
//                                        )
//                                    );
//                                    // Locate a facebook page for result
//                                } else if (itemURL.contains('www.facebook.com')) {
//                                    defList.append(
//                                        $('<li class="facebook icon"/>').append(
//                                            $('<a/>').text(item.Title.replace('| Facebook', '')).attr('href', item.Url)
//                                        )
//                                    );
//                                    // find a YouTube user account
//                                } else if (itemURL.contains('www.youtube.com/user/')) {
//                                    defList.append(
//                                        $('<li class="youtube icon"/>').append(
//                                            $('<a/>').text(item.Title.replace('- YouTube', '')).attr('href', item.Url)
//                                        )
//                                    );
//                                    // this will just find youtube videos that might be useful
//                                } else if (itemURL.contains('www.youtube.com')) {
//                                    defVideos.append(
//                                        $('<li/>').append(
//                                            $('<a/>').attr('href', item.Url).append(
//                                                $('<img/>').css({ 'width': 140, 'height': 100 }).attr("src", "http://placehold.it/140x100")
//                                            )
//                                        )
//                                    );
//                                } else if (itemURL.contains('www.amazon.com')) {
//                                    // we don't want amazon results showing up as they
//                                    // will be duplicates of what Amazon gives us
//                                    // defList.append(
//                                    //   $('<li/>').append(
//                                    //     $('<a/>').text(item.title).attr('href', item.link)
//                                    //     )
//                                    //   );
//                                } else if (itemURL.contains('www.yelp.com')) {
//                                    // we don't want yelp results showing up as they
//                                    // will be duplicates of what Amazon gives us
//                                    // defList.append(
//                                    //   $('<li/>').append(
//                                    //     $('<a/>').text(item.title).attr('href', item.link)
//                                    //     )
//                                    //   );
//                                } else {
//                                    rest.push(item);
//                                }
//                            }


                        } else {
                            content.parent().remove();
                        }

                        break;

                    case 'amazon.com':
                        var content = $('#details-list li[data-engine="' + data.engineId + '"] .content');
                        var product = data.result && data.result.length;
                        var first, $first;

                        if (product) {
                            first = data.result.shift();
                            $first = $('<div class="result-header cf"/>').css({ 'background-image': 'url(' + ((first.mediumimage) ? first.mediumimage[0].url[0] : '') + ')' }).appendTo(content);
                            $first.append(
                                $('<div class="result-header-info"/>').append(
                                    $('<p class="result-header-title"/>').text(first.itemattributes[0].title[0]),
                                    $('<p class="result-header-price"/>').text((first.itemattributes[0].listprice && first.itemattributes[0].listprice[0].formattedprice) ? first.itemattributes[0].listprice[0].formattedprice[0] : ''),
                                    $('<p class="result-header-snippet"/>').html((first.itemattributes[0].feature) ? first.itemattributes[0].feature[0] : '')
                                )
                            );
                            data.result.slice(0, Math.min(3, data.result.length)).forEach(function (item) {
                                var attrs = item.itemattributes[0];
                                if (item.detailpageurl && attrs) {
                                    content.append(
                                        $('<div class="result-item result-item-fixed-height"/>').data({ url: item.detailpageurl[0] }).append(
                                            $('<div class="result-image-wrapper"/>').append(
                                                $('<img class="result-image"/>').attr('src', ((item.mediumimage) ? item.mediumimage[0].url[0] : ''))
                                            ),
                                            $('<div class="result-info"/>').append(
                                                $('<p class="result-title"/>').text(attrs.title[0]),
                                                $('<p class="result-price"/>').text((attrs.listprice && attrs.listprice[0].formattedprice) ? attrs.listprice[0].formattedprice[0] : '')
                                            )
                                        )
                                    );
                                }
                            });
                        } else {
                            content.parent().remove();
                        }
                        break;

                    case 'yelp.com':
                        var businesses = data.result && data.result.businesses;

                        var content = $('<div data-cardtype="yelp.com" class="big-card">');
                        var first, $first, $reviews;

                        if (businesses) {
                            first = businesses.shift();

                            content.append(
                                $('<div />').append(
                                    $('<img src="images/yelp.com-16x16.png"/> <a class="result-title"/>').html(first.name).attr('href', first.url),
                                    $('<img width="240" src="' + (first.image_url || '').replace(/ms.jpg$/, "l.jpg") + '"/>'),
                                    $('<p class="result-snippet"/>').text(first.location.address.shift()),
                                    $('<p class="result-snippet"/>').text(first.display_phone),
                                    $('<p class="result-snippet"/>').text(first.review_count + " reviews"),
                                    $('<br/>')
                                )
                            );

//                            $first = $('<div class="result-header cf"/>').css({ 'background-image': 'url(' + (first.image_url || '').replace(/ms.jpg$/, "l.jpg") + ')' }).appendTo(content);

//                            $reviews = $('<div class="result-header-reviews"/>');
//                            for (var i = 0; i < 5; i += 1) {
//                                if (i < Math.floor(first.rating)) {
//                                    $reviews.append($('<i class="icon-star"></i>'));
//                                } else if (i < first.rating) {
//                                    $reviews.append(
//                                        $('<div class="icon-star-half-colored"/>').append(
//                                            $('<i class="icon-star-half"></i>'),
//                                            $('<i class="icon-star-half-empty"></i>')
//                                        )
//                                    );
//                                } else {
//                                    $reviews.append($('<i class="icon-star-empty"></i>'));
//                                }
//                            }
//                            // need a bit of space between stars and # of reviews
//                            $reviews.append(" ");

//                            $first.append(
//                                $('<div data-cardtype="yelp.com" class="card"/>').append(
//                                    $('<img src="images/yelp.com-16x16.png"/>',"Yelp ")),
////                                    $('<img src="' + (first.image_url || '').replace(/ms.jpg$/, "l.jpg") + '"/>'),
//                                    $('<p class="result-title"/>').text(first.name),
//                                    $('<p class="result-snippet"/>').text(first.location.address.shift()),
//                                    $('<p class="result-snippet"/>').text(first.display_phone),
//                                    $('<p class="result-snippet"/>').text(first.review_count + " reviews")
//                            );

                            businesses.slice(0, Math.min(3, businesses.length)).forEach(function (item) {
                                var $reviews = $('<div class="result-reviews"/>');
                                for (var i = 0; i < 5; i += 1) {
                                    if (i < Math.floor(item.rating)) {
                                        $reviews.append($('<i class="icon-star"></i>'));
                                    } else if (i < first.rating) {
                                        $reviews.append(
                                            $('<div class="icon-star-half-colored"/>').append(
                                                $('<i class="icon-star-half"></i>'),
                                                $('<i class="icon-star-half-empty"></i>')
                                            )
                                        );
                                    } else {
                                        $reviews.append($('<i class="icon-star-empty"></i>'));
                                    }
                                }
                                content.append(
                                    $('<div class="result-item result-item-fixed-height cf"/>').append(
                                        $('<div class="result-info"/>').append(
                                            $('<a class="result-title"/>').html(item.name).attr('href', item.url),
                                            $('<div class="result-image-wrapper"/>').append(
                                                $('<img class="result-image"/>').attr('src', (item.image_url || ''))
                                            ),
                                            $('<p class="result-snippet"/>').text(item.location.address.shift()),
                                            $('<p class="result-snippet"/>').text(item.display_phone),
                                            $('<p class="result-snippet"/>').text(item.review_count + " reviews"),
                                            $('<br/>')
//                                            $reviews,
//                                            $('<span class="result-reviews"/>').text(item.review_count + " reviews")
                                        )

                                    )
                                );
                            });
                        } else {
                            content.parent().remove();
                        }

                        //prepend the whole yelp card in the columns
                        gridwrapper_columns.prepend(content);

                        break;

                    case 'foursquare.com':
                        var venues = data.result && data.result.venues;

                        if (venues) {
                            venues.forEach(function (item, index, list) {
                                gridwrapper_columns.append(
                                    $('<div data-cardtype="foursquare.com" class="card"/>').append(
                                        $('<img src="images/foursquare-16x16.png"/><a class="result-title"/>').html(item.name).attr('href', item.url),
                                        $('<p class="result-snippet"/>').html(item.location.address),
                                        $('<p class="result-snippet"/>').html(item.location.city + ", " + item.location.state),
                                        $('<p class="result-snippet"/>').html(item.contact.formattedPhone)
                                    )
                                );

                            });
                        }
                        break;

//                        //var groups = data.result && data.result.groups;
//                        var businesses = data.result.venues;
////                        if (groups) {
////                            groups.every(function (group) {
////                                if (group.name === "recommended") {
////                                    businesses = group.items;
////                                    return false;
////                                }
////                                return true;
////                            });
////                        }
//                        var content = $('<div/>', {
//                            id: 'foursquare-card'
//                        });
//                        var first, $first, $reviews;
//
//                        if (businesses) {
//                            first = businesses.shift();
//                            $first = $('<div class="result-header cf"/>').css({ 'background-image': 'url(' + (first.venue.photos.groups[0].items[0].prefix + "320x320" + first.venue.photos.groups[0].items[0].suffix || '') + ')' }).appendTo(content);
////                            $reviews = $('<div class="result-header-reviews"/>');
////                            $reviews = $('<div class="result-header-reviews"/>');
////                            $reviews.append($("<span class='venue-rating'/>").text((first.venue.rating || 0).toPrecision(2)).
////                                toggleClass("venue-rating-positive", first.venue.rating && first.venue.rating > 7).
////                                toggleClass("venue-rating-neutral", first.venue.rating && first.venue.rating <= 7));
////                            // need a bit of space between stars and # of reviews
////                            $reviews.append(" ");
//                            $first.append(
//                                $('<span class="search-brand-icon"/>').append("FourSquare ", $('<img class="search-brand-image image-foursquare" src="images/foursquare-16x16.png"/>')),
//                                $('<div class="result-header-info"/>').append(
//                                    $('<p class="result-header-title"/>').text(first.name),
//                                    $('<p class="result-header-address"/>').text(first.location.address),
//                                    $('<p class="result-header-phone"/>').text(first.contact.formattedPhone)
//                                    //$reviews.append($('<span/>').text(first.likes.count + " likes"))
//                                )
//                            );
//                            businesses.slice(0, Math.min(3, businesses.length)).forEach(function (item) {
//                                var $reviews = $('<div class="result-reviews"/>');
//                                var src = '';
//                                if (item.venue.photos && item.venue.photos.groups[0] && item.venue.photos.groups[0].items[0]) {
//                                    src = (item.venue.photos.groups[0].items[0].prefix + "100x100" + item.venue.photos.groups[0].items[0].suffix);
//                                }
//                                $reviews = $('<div class="result-header-reviews"/>').
//                                    append($("<span class='venue-rating'/>").text((item.venue.rating || 0).toPrecision(2)).
//                                        toggleClass("venue-rating-positive", item.venue.rating && item.venue.rating > 7).
//                                        toggleClass("venue-rating-neutral", item.venue.rating && item.venue.rating <= 7));
//                                content.append(
//                                    $('<div class="result-item result-item-fixed-height cf"/>').append(
//                                        $('<div class="result-image-wrapper"/>').append(
//                                            $('<img class="result-image"/>').attr('src', src)
//                                        ),
//                                        $('<div class="result-info"/>').append(
//                                            $('<p class="result-title"/>').text(item.venue.name),
//                                            $reviews,
//                                            $('<span class="result-reviews"/>').text(item.venue.likes.count + " likes")
//                                        )
//                                    )
//                                );
//                            });
//                        } else {
//                            content.parent().remove();
//                        }
//
//                        //prepend foursquare card to columns
//                        gridwrapper_columns.prepend(content);
//
//
//                        break;

                    case 'firefox.marketplace':
                        var json = $.parseJSON(data.result);
                        var apps = json.objects;

                        if (apps) {
                            apps.forEach(function (item, index, list) {
                                gridwrapper_columns.prepend(
                                    $('<div data-cardtype="firefox.marketplace" class="card"/>').append(
                                        $('<img src="images/firefox-marketplace-16x16.png"/><a class="result-title"/>').html(item.name).attr('href', item.absolute_url),
                                        $('<p class="result-snippet"/>').html(item.author),
                                        $('<p class="result-snippet"/>').html("Rating: " + item.ratings.average),
                                        $('<p class="result-snippet"/>').html("Reviews: " + item.ratings.count),
                                        $('<img class="result-snippet" />').attr("src", item.icons["64"])
                                    )
                                );

                            });
                        }
                        break;

                    case 'nytimes.article':
                        console.log("in nytimes article - 2")
                        var json = $.parseJSON(data.result);
                        var articles = json.response.docs;

                        if (articles) {
                            articles.forEach(function (item, index, list) {

                                //see if there's an image associated with the article
//                                var articleImage = "";
//                                if(item.multimedia && item.multimedia.length > 0){
//                                    articleImage = "http://www.nytimes.com/" + item.multimedia[0].url;
//                                }

//                                var source = "";
//                                if(item.source){
//                                    source = item.source + " - ";
//                                }
//
//
//                                gridwrapper_columns.append(
//                                    $('<div data-cardtype="nytimes.article" class="card"/>').append(
//                                        $('<img src="images/nytimes-article-16x16.png"/><a class="result-title"/>').html(source + item.headline.main).attr('href', item.web_url),
////                                        $('<p class="result-snippet"/>').html(item.pub_date),
////                                        $('<img class="result-snippet" />').attr("src", articleImage),
//                                        $('<p class="result-snippet"/>').html(item.snippet.elide(nytimesArticleDescriptionLength))
//                                    )
//                                );

                            });
                        }
                        break;

                    case 'en.wikipedia.org':
                        var article = data.result;

                        if (article) {
                            $('#definition-text').html(article);
                        }
                        break;

                    case 'wikipedia.infobox':
                        var article = data.result;

                        if (article) {
                            if ($(article)[0] && $(article)[0].data == "null") {
                                console.log("ERROR: no wiki card")
                            } else {
                                gridwrapper_columns.prepend(
                                    $('<div data-cardtype="wikipedia.infobox" class="wikipedia-info-card">').append(article).append("</div>")
                                );
                            }
                        }
                        break;

                    case 'twitter.com':
                        var tweets = data.result;
                        //var content = $('#details-list li[data-engine="' + data.engineId + '"] .content');

                        if (tweets) {
                            // https://twitter.com/logo#twitter-content
                            tweets.statuses.slice(0, Math.min(twitterResultsLimit, tweets.statuses.length)).forEach(function (item) {
                                gridwrapper_columns.append(
                                    $('<div data-cardtype="twitter.com" class="card"/>').append(
                                        $('<div class="result-tweet"/>').append(
                                            $('<div class="result-tweet-user-info"/>').append(

                                                $('<img src="images/twitter16x16.png"/><a class="result-title"/>').html(item.user.name + " @" + item.user.screen_name).attr('href', "https://www.twitter.com/"+item.user.screen_name+"/status/"+item.id)
                                                //$('<img src="images/twitter16x16.png"/><span class="result-tweet-user-name"/>').text(item.user.name + " "),
                                                //$('<span class="result-tweet-user-screen-name"/>').text(item.user.screen_name)
                                            ),
                                            $('<p class="result-tweet-text"/>').html(item.text),
                                            $('<div class="result-tweet-meta"/>').append(
                                                $('<p class="result-tweet-time-ago"/>').text(moment(item.created_at).fromNow()),
                                                $('<i class="icon-twitter"></i>')
                                            )
                                        )
                                    )
                                );
                            });
                        } else {
                            //content.parent().remove();
                        }
                        break;

                    default:
                        break;
                }
                ;
            });
        });

        // Load initial search template
        nunjucks.render('suggest.html', function (err, res) {
            suggestions.html(res);
        });

        find.get(0).addEventListener('input', function (ev) {
            var value = find.val().toString();

            // if this is a change in terms or empty string
            if (lastTerm !== value || value.length < 1) {
                autoset.engineClear();
                $('.suggestions, .suggestions-secondary').empty();
            }

            lastTerm = value;

            if (value.length >= 1) {
                socket.emit('api/find', {
                    term: value,
                    search: searchCategory,
//                    location: geo.getLastLocation(),
//                    geolocation: geo.getLastPosition().coords.latitude + ',' + geo.getLastPosition().coords.longitude
                    location: '',
                    geolocation: ''

                });
            }
        });

        find.on('keydown', function (ev) {
            if (ev.which === 13) {
                goSearch(find.val().toString());
            }
        });

        find.one('focus', function () {
            find.addClass('fifi-find-box-focused')
                .find('#fifi-find-box')
                .addClass('fifi-find-box-focused');
            geo.startWatchingPosition($('#geolocation-name'));
        });

        function goBack() {
            gridwrapper.hide();
            gridwrapper_columns.empty();
            closeLeftMenu();
            suggestions.show();
            // reset original search terms
            find.val(lastTerm);
            inResults = false;
        }

        find.on('focus', function () {
            if (inResults) {
                goBack();
            }
        });

        $("#fifi-find-submit").on('click', function () {
            gridwrapper.hide();
            gridwrapper_columns.empty();
            goSearch(find.val());
        });

        // on N+1 runs, if we've already successfully gotten their location
        // lets just go ahead and grab it again.  there's no real API to know
        // that our site has been granted the location permission

//        if (geo.haveGeolocationPermission()) {
//            geo.startWatchingPosition($('#geolocation-name'));
//        }


        function goSearch(term) {
            suggestions.hide();

            gridwrapper.show();

            // save the current terms
            lastTerm = find.val();
            // set suggested terms as current
            find.val(term);

            for (var engine in autoset.engines[searchCategory]) {
                if (fifiSearchPreferences[searchCategory][engine]) {
                    //only search an engine if it's currently enabled
                    //check for side filtering
                    socket.emit('api/query', {
                        term: term,
//                    location: geo.getLastLocation(),
//                    geolocation: geo.getLastPosition().coords.latitude + ',' + geo.getLastPosition().coords.longitude,
                        location: '',
                        geolocation: '',
                        engineId: engine,
                        search: searchCategory
                    });
                }
            }

            inResults = true;
//            nunjucks.render('details.html', { 'term': term }, function (err, res) {
//                inResults = true;
//                $('#details').html(res).show();
//            });
        }

        suggestions.on('touchstart click', function (ev) {
            var self = $(ev.target);

            switch (self.data('action')) {
                case 'concept':
                    goSearch(self.data('term'))
                    break;

                case 'back':
                    goBack();
                    break;

//                case 'geolocation':
//                    if (!geo.isWatchingPosition()) {
//                        geo.startWatchingPosition($('#geolocation-name'));
//                    } else {
//                        geo.stopWatchingPosition();
//                    }
//                    break;


            }
        });


        /**********************************************/
        /* Left Slide menu */
        /**********************************************/

        function openLeftMenu() {
            $("#leftMenu").addClass('left-menu-open');
        }

        function closeLeftMenu() {
            $("#leftMenu").removeClass('left-menu-open');
        }

        //handle clicks on the search provider icons in the left menu
        $(".provider").on('click', function () {
            //hide the cards from this search provider in the grid
            if ($(this).hasClass("providerInactive")) {
                //provider was inactive, re-activate it
                $("[data-cardtype='" + $(this).data('provider') + "']").show();
            } else {
                $("[data-cardtype='" + $(this).data('provider') + "']").hide();
            }

            //save the settings in localStorage
            toggleProviderStatus($(this).data('category'), $(this).data('provider'))

            //grey out the icon to indicate inactive or return to normal state
            $(this).toggleClass("providerInactive");
        });

        /**********************************************/
        /* Search Provider store */
        /**********************************************/
        $("[data-category='add_providers']").on('click', function () {

            if ($('#lightbox').length > 0) { // #lightbox exists
                $('#content').html('<p>hello</p>');
                $('#lightbox').show(); //.show('fast') for a transition
            }
            else {
                var lightbox =
                    '<div id="lightbox">' +
                        '<a href="#" id="closeLightbox">Click to Close</a>' +
                        '<div id="content">' + //insert clicked link's href into img src
                        '<p id="lightbox-content">hello</p>' +
                        '</div>' +
                        '</div>';
                //insert lightbox HTML into page
                $('body').append(lightbox);
            }
            //Click anywhere on the page to get rid of lightbox window
            $('#closeLightbox').on('click', function () { //must use live, as the lightbox element is inserted into the DOM
                $('#lightbox').hide();
            });
        });

/*********************************************/
/* Anthony scroll up code */
/*********************************************/
$(document).ready(function () {

    find.on("focus", function () {
        var scrollTo = $(this).offset().top - 30;
        scrollPage(scrollTo, "up");
    });

    // find.on("blur",function(){
    //     var scrollTo = 0;
    //     scrollPage(scrollTo, "down");
    // });

    function scrollPage(scrollTo, direction) {
        var bounceOffset;

        if (direction == "up") {
            bounceOffset = 20;
        } else {
            bounceOffset = 0;
        }

        $("body", "html").animate({
            scrollTop: scrollTo,
            easing: "linear"
        }, 200, function () {

            // $("body","html").animate({
            //   scrollTop : scrollTo,
            //   easing : "linear"
            // }, 150)

        });
    }
});


function showNewsViz() {
    console.log("called")
//        $("#wrapper").hide();
//        $("#boxfishNewsViz").show();
    document.getElementById("wrapper").style.visibility = "hidden";
    document.getElementById("boxfishNewsViz").style.visibility = "visible";
}
})
;
/* end function require pass params */


