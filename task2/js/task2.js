"use strict";

$(function () {
    const CASE_TEXT = {
        1: "Who is in the hall?",
        2: "Who is dressed in yellow or purple?",
        3: "Which ATU students are upstairs?",
        4: "Who has glasses or a bag?",
        5: "Who came with nothing at all?",
        6: "Who has a phone but no bag?",
        7: "Who arrived from 20:30 to 21:00, both included?",
        8: "Who arrived after 21:00 and is not an ATU student?",
        9: "Who stands right next to Askar?",
        10: "Who stands last in each room?",
        11: "Who stands third in each room?",
        12: "Who stands after Timur in his room?",
        13: "Who stands right before someone in black?",
        14: "In which room is the birthday person, Aruzhan?",
        15: "Which rooms have fewer than 6 guests?",
        16: "Which rooms have a cup but nobody wearing glasses?",
        17: "Who came first to each room?",
        18: "Miras arrives and stands between Askar and Inkar.",
        19: "Natasha says goodbye and goes home.",
        20: "Who took the cake?"
    };

    const SELECTOR_TEXT = {
        1: '$(".room[data-room=\\"hall\\"] .guest")',

        2: '$(".guest[data-color=\\"yellow\\"], ' +
            '.guest[data-color=\\"purple\\"]")',

        3: '$(".floor[data-floor=\\"2\\"] .guest.atu")',

        4: '$(".guest.wears-glasses, .guest.has-bag")',

        5: '$(".guest[data-items=\\"\\"]")',

        6: '$(".guest.has-phone:not(.has-bag)")',

        7: '$(".guest").filter(arrival >= "20:30" && arrival <= "21:00")',

        8: '$(".guest[data-atu=\\"false\\"]")' +
            '.filter(arrival > "21:00")',

        9: '$(".guest[data-name=\\"Askar\\"]").next(".guest")',

        10: '$(".room .guest-list > .guest:last-child")',

        11: '$(".room .guest-list > .guest:nth-child(3)")',

        12: '$(".guest[data-name=\\"Timur\\"]").next(".guest")',

        13: '$(".guest[data-color=\\"black\\"]").prev(".guest")',

        14: '$(".guest[data-birthday=\\"true\\"]").closest(".room")',

        15: '$(".room:not(:has(.guest-list > .guest:nth-child(6)))")',

        16: '$(".room:has(.guest.has-cup)' +
            ':not(:has(.guest.wears-glasses))")',

        17: '$(".room .guest-list > .guest:first-child")',

        18: '$(".guest[data-name=\\"Askar\\"]")' +
            '.after(Miras).next(".guest").fadeIn()',

        19: '$(".guest[data-name=\\"Natasha\\"]").fadeOut().remove()',

        20: '$(".floor[data-floor=\\"1\\"] ' +
            '.guest.has-cake-crumbs:not(.has-cup)")' +
            ".filter(time and adjacent ATU student)"
    };

    const THING_INFO = {
        phone: {
            icon: "📱",
            label: "Phone"
        },
        bag: {
            icon: "👜",
            label: "Bag"
        },
        cup: {
            icon: "🥤",
            label: "Cup"
        },
        "cake-crumbs": {
            icon: "🍰",
            label: "Cake crumbs"
        }
    };

    const originalPartyData = copyObject(PARTY_DATA);

    let partyState = preparePartyData(copyObject(originalPartyData));

    let roomSortState = {};

    let $openDetail = null;
    let openGuestId = null;
    let detailIsClosing = false;
    let pendingGuestId = null;
    let afterCloseAction = null;

    const movingGuestIds = new Set();

    function copyObject(object) {
        return JSON.parse(JSON.stringify(object));
    }

    function makeGuestId(name) {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");
    }

    function preparePartyData(data) {
        data.rooms.forEach(function (room) {
            room.guests.forEach(function (guest, index) {
                guest.id = guest.id || makeGuestId(guest.name);

                if (typeof guest.pictureOrder !== "number") {
                    guest.pictureOrder = index;
                }
            });
        });

        return data;
    }

    function getRoomData(roomId) {
        return partyState.rooms.find(function (room) {
            return room.id === roomId;
        });
    }

    function findGuestInData(guestId) {
        let result = null;

        partyState.rooms.some(function (room) {
            const guestIndex = room.guests.findIndex(function (guest) {
                return guest.id === guestId;
            });

            if (guestIndex !== -1) {
                result = {
                    room: room,
                    guest: room.guests[guestIndex],
                    guestIndex: guestIndex
                };

                return true;
            }

            return false;
        });

        return result;
    }

    function createGuestCard(guest) {
        const classes = ["guest"];

        if (guest.atu) {
            classes.push("atu");
        } else {
            classes.push("not-atu");
        }

        if (guest.glasses) {
            classes.push("wears-glasses");
        } else {
            classes.push("no-glasses");
        }

        guest.things.forEach(function (thing) {
            classes.push("has-" + thing);
        });

        const allItems = guest.things.slice();

        if (guest.glasses) {
            allItems.push("glasses");
        }

        const avatarUrl =
            "https://api.dicebear.com/9.x/open-peeps/svg?seed=" +
            encodeURIComponent(guest.name) +
            "&backgroundColor=transparent";

        const $card = $("<article>", {
            class: classes.join(" "),
            "aria-label": guest.name,
            tabindex: 0
        }).attr({
            "data-guest-id": guest.id,
            "data-name": guest.name,
            "data-color": guest.color,
            "data-arrival": guest.arrival,
            "data-atu": String(guest.atu),
            "data-items": allItems.join(","),
            "data-birthday": String(Boolean(guest.birthday)),
            "data-picture-order": guest.pictureOrder
        });

        const $avatarFrame = $("<div>", {
            class: "avatar-frame"
        }).css("--clothing-color", guest.colorCode);

        const $avatar = $("<img>", {
            src: avatarUrl,
            alt: guest.name + " avatar"
        });

        $avatarFrame.append($avatar);

        if (guest.atu) {
            $avatarFrame.append(
                $("<span>", {
                    class: "atu-badge",
                    text: "ATU",
                    title: "ATU student"
                })
            );
        }

        const $name = $("<span>", {
            class: "guest-name",
            text: guest.name,
            title: guest.name
        });

        const $time = $("<time>", {
            class: "arrival-time",
            datetime: guest.arrival,
            text: guest.arrival,
            title: "Arrival time"
        });

        const $things = $("<div>", {
            class: "guest-things"
        });

        if (guest.glasses) {
            $things.append(
                $("<span>", {
                    text: "👓",
                    title: "Glasses",
                    "aria-label": "Glasses"
                })
            );
        }

        guest.things.forEach(function (thing) {
            const information = THING_INFO[thing];

            $things.append(
                $("<span>", {
                    text: information.icon,
                    title: information.label,
                    "aria-label": information.label
                })
            );
        });

        if (allItems.length === 0) {
            $things.append(
                $("<span>", {
                    class: "no-things",
                    text: "nothing"
                })
            );
        }

        return $card.append($avatarFrame, $name, $time, $things);
    }

    function renderParty() {
        closeDetailImmediately();

        const $house = $("#house").empty();

        roomSortState = {};

        [2, 1].forEach(function (floorNumber) {
            const roomsOnFloor = partyState.rooms.filter(function (room) {
                return room.floor === floorNumber;
            });

            const $floor = $("<section>", {
                class: "floor"
            }).attr("data-floor", floorNumber);

            const $floorLabel = $("<div>", {
                class: "floor-label",
                text: "Floor " + floorNumber
            });

            const $floorRooms = $("<div>", {
                class: "floor-rooms"
            });

            roomsOnFloor.forEach(function (room) {
                const $room = $("<section>", {
                    class: "room"
                }).attr({
                    "data-room": room.id,
                    "data-room-name": room.name
                });

                const $roomCount = $("<span>", {
                    class: "room-count",
                    text: room.guests.length + " guests"
                });

                const $sortButton = $("<button>", {
                    class: "sort-button",
                    type: "button",
                    text: "Sort by time",
                    "data-room": room.id
                });

                const $roomTitleRight = $("<div>", {
                    class: "room-title-right"
                }).append($roomCount, $sortButton);

                const $roomTitle = $("<div>", {
                    class: "room-title"
                }).append(
                    $("<h3>", {
                        text: room.name
                    }),
                    $roomTitleRight
                );

                const $guestList = $("<div>", {
                    class: "guest-list"
                });

                room.guests.forEach(function (guest) {
                    $guestList.append(createGuestCard(guest));
                });

                $room.append($roomTitle, $guestList);
                $floorRooms.append($room);
            });

            $floor.append($floorLabel, $floorRooms);
            $house.append($floor);
        });

        clearSpotlight(false);
    }

    function renderCaseButtons() {
        const $buttons = $("#case-buttons").empty();

        Object.keys(CASE_TEXT).forEach(function (caseNumber) {
            const $button = $("<button>", {
                class: "case-button",
                type: "button",
                "data-case": caseNumber
            }).append(
                $("<span>", {
                    class: "case-number",
                    text: caseNumber
                }),
                $("<span>", {
                    class: "case-question",
                    text: CASE_TEXT[caseNumber]
                })
            );

            $buttons.append($button);
        });
    }

    function updateRoomCount(roomId) {
        const roomData = getRoomData(roomId);

        $('.room[data-room="' + roomId + '"] .room-count').text(
            roomData.guests.length + " guests"
        );
    }

  

    
    function applySpotlight($matchingGuests) {
        const matchingElements = new Set($matchingGuests.get());
        const $allGuests = $(".guest");

        $allGuests.each(function () {
            const $guest = $(this);

            $guest
                .stop(true, false)
                .removeClass("spotlight-match")
                .css("top", 0);

            if (matchingElements.has(this)) {
                $guest
                    .addClass("spotlight-match")
                    .fadeTo(300, 1)
                    .animate({ top: -12 }, 150)
                    .animate({ top: 0 }, 150);
            } else {
                $guest.fadeTo(300, 0.2);
            }
        });
    }

    function clearSpotlight(animate) {
        const duration = animate === false ? 0 : 300;

        $(".guest")
            .stop(true, false)
            .removeClass("spotlight-match found")
            .css("top", 0)
            .fadeTo(duration, 1);

        $(".room").removeClass("found");

        document.querySelectorAll(".case-button").forEach(function (button) {
            button.classList.remove("active");
        });

        $("#result-title").text("Choose a case");

        $("#result-text").text(
            "Matching guests will remain bright."
        );

        $("#selector-used").text("—");
    }

    function setActiveCase(caseNumber) {
        document.querySelectorAll(".case-button").forEach(function (button) {
            const active =
                Number(button.dataset.case) === Number(caseNumber);

            button.classList.toggle("active", active);
        });
    }

    function displayResult($found, resultType) {
        const elements = Array.from($found);
        let labels;

        if (elements.length === 0) {
            $("#result-title").text("No matches");
            $("#result-text").text("No matching guest or room was found.");
            return;
        }

        if (resultType === "room") {
            labels = elements.map(function (room) {
                return room.dataset.roomName;
            });
        } else {
            labels = elements.map(function (guest) {
                return guest.dataset.name;
            });
        }

        const noun = resultType === "room"
            ? (elements.length === 1 ? "room" : "rooms")
            : (elements.length === 1 ? "guest" : "guests");

        $("#result-title").text(
            elements.length + " " + noun + " found"
        );

        $("#result-text").text(labels.join(", "));
    }

    function finishCase($found, resultType) {
        let $matchingGuests;

        if (resultType === "room") {
            $found.addClass("found");
            $matchingGuests = $found.find(".guest");
        } else {
            $matchingGuests = $found;
        }

        displayResult($found, resultType);
        applySpotlight($matchingGuests);
    }

    function runCase(caseNumber) {
        setActiveCase(caseNumber);
        $("#selector-used").text(SELECTOR_TEXT[caseNumber]);

        let $found;
        let resultType = "guest";

        switch (caseNumber) {
            case 1:
                $found =
                    $('.room[data-room="hall"] .guest');
                break;

            case 2:
                $found =
                    $('.guest[data-color="yellow"], ' +
                      '.guest[data-color="purple"]');
                break;

            case 3:
                $found =
                    $('.floor[data-floor="2"] .guest.atu');
                break;

            case 4:
                $found =
                    $(".guest.wears-glasses, .guest.has-bag");
                break;

            case 5:
                $found =
                    $('.guest[data-items=""]');
                break;

            case 6:
                $found =
                    $(".guest.has-phone:not(.has-bag)");
                break;

            case 7:
                $found =
                    $(".guest").filter(function () {
                        return (
                            this.dataset.arrival >= "20:30" &&
                            this.dataset.arrival <= "21:00"
                        );
                    });
                break;

            case 8:
                $found =
                    $('.guest[data-atu="false"]').filter(function () {
                        return this.dataset.arrival > "21:00";
                    });
                break;

            case 9:
                $found =
                    $('.guest[data-name="Askar"]').next(".guest");
                break;

            case 10:
                $found =
                    $(".room .guest-list > .guest:last-child");
                break;

            case 11:
                $found =
                    $(".room .guest-list > .guest:nth-child(3)");
                break;

            case 12:
                $found =
                    $('.guest[data-name="Timur"]').next(".guest");
                break;

            case 13:
                $found =
                    $('.guest[data-color="black"]').prev(".guest");
                break;

            case 14:
                resultType = "room";

                $found =
                    $('.guest[data-birthday="true"]').closest(".room");
                break;

            case 15:
                resultType = "room";

                $found =
                    $(
                        ".room:not(" +
                        ":has(.guest-list > .guest:nth-child(6))" +
                        ")"
                    );
                break;

            case 16:
                resultType = "room";

                $found =
                    $(
                        ".room:has(.guest.has-cup)" +
                        ":not(:has(.guest.wears-glasses))"
                    );
                break;

            case 17:
                $found =
                    $(".room .guest-list > .guest:first-child");
                break;

            case 18:
                runMirasCase();
                return;

            case 19:
                runNatashaCase();
                return;

            case 20:
                $found =
                    $(
                        '.floor[data-floor="1"] ' +
                        ".guest.has-cake-crumbs:not(.has-cup)"
                    ).filter(function () {
                        const previousGuest = this.previousElementSibling;
                        const nextGuest = this.nextElementSibling;

                        const previousIsAtu =
                            previousGuest !== null &&
                            previousGuest.matches(".guest.atu");

                        const nextIsAtu =
                            nextGuest !== null &&
                            nextGuest.matches(".guest.atu");

                        return (
                            this.dataset.arrival > "21:00" &&
                            this.dataset.arrival <
                                partyState.cakeDisappearedAt &&
                            (previousIsAtu || nextIsAtu)
                        );
                    });
                break;

            default:
                return;
        }

        finishCase($found, resultType);
    }

    function runMirasCase() {
        const existingMiras =
            document.querySelector('.guest[data-name="Miras"]');

        if (existingMiras !== null) {
            const $found =
                $('.guest[data-name="Miras"]');

            finishCase($found, "guest");
            return;
        }

        const askarRecord = findGuestInData("askar");

        if (askarRecord === null) {
            displayResult($(), "guest");
            return;
        }

        const miras = copyObject(LATE_GUEST);

        miras.id = "miras";
        miras.pictureOrder = askarRecord.guest.pictureOrder + 0.5;

        askarRecord.room.guests.splice(
            askarRecord.guestIndex + 1,
            0,
            miras
        );

        let $found;

        $found =
            $('.guest[data-name="Askar"]')
                .after(createGuestCard(miras).hide())
                .next(".guest")
                .fadeIn(500, function () {
                    updateRoomCount(askarRecord.room.id);
                    finishCase($found, "guest");
                });
    }

    function runNatashaCase() {
        const $found =
            $('.guest[data-name="Natasha"]');

        if ($found.length === 0) {
            displayResult($found, "guest");
            applySpotlight($found);
            return;
        }

        displayResult($found, "guest");
        applySpotlight($found);

        const natashaRecord = findGuestInData("natasha");

        if (natashaRecord !== null) {
            natashaRecord.room.guests.splice(
                natashaRecord.guestIndex,
                1
            );
        }

        $found
            .stop(true, false)
            .delay(500)
            .fadeOut(500, function () {
                $(this).remove();

                if (natashaRecord !== null) {
                    updateRoomCount(natashaRecord.room.id);
                }
            });
    }





    function getThingNames(guest) {
        const names = guest.things.map(function (thing) {
            return THING_INFO[thing].label;
        });

        if (guest.glasses) {
            names.unshift("Glasses");
        }

        return names.length > 0 ? names.join(", ") : "Nothing";
    }

    function createDetailCard(guestRecord) {
        const guest = guestRecord.guest;
        const room = guestRecord.room;

        const $sourceGuest =
            $('.guest[data-guest-id="' + guest.id + '"]').first();

        const $detailAvatar =
            $sourceGuest.find(".avatar-frame img").clone();

        const $avatarContainer = $("<div>", {
            class: "detail-avatar"
        })
            .css("--detail-color", guest.colorCode)
            .append($detailAvatar);

        const $top = $("<div>", {
            class: "detail-top"
        }).append(
            $avatarContainer,
            $("<div>", {
                class: "detail-heading"
            }).append(
                $("<h2>", {
                    text: guest.name
                }),
                $("<p>", {
                    class: "detail-room",
                    text: "Currently in: " + room.name
                })
            )
        );

        const information = [
            ["Arrival time", guest.arrival],
            ["Clothing", guest.color],
            ["ATU student", guest.atu ? "Yes" : "No"],
            ["Things", getThingNames(guest)]
        ];

        const $information = $("<div>", {
            class: "detail-information"
        });

        information.forEach(function (item) {
            $information.append(
                $("<div>", {
                    class: "detail-item"
                }).append(
                    $("<span>", {
                        text: item[0]
                    }),
                    $("<strong>", {
                        text: item[1]
                    })
                )
            );
        });

        const $moveButtons = $("<div>", {
            class: "move-buttons"
        });

        partyState.rooms.forEach(function (possibleRoom) {
            if (possibleRoom.id !== room.id) {
                $moveButtons.append(
                    $("<button>", {
                        class: "move-button",
                        type: "button",
                        text: "Move to " + possibleRoom.name,
                        "data-guest-id": guest.id,
                        "data-target-room": possibleRoom.id
                    })
                );
            }
        });

        const $moveSection = $("<section>", {
            class: "move-section"
        }).append(
            $("<h3>", {
                text: "Move this guest"
            }),
            $moveButtons
        );

        const $content = $("<div>", {
            class: "guest-detail-content"
        }).append(
            $top,
            $information,
            $moveSection,
            $("<p>", {
                class: "detail-instructions",
                text: "Click outside this card or press Esc to close it."
            })
        );

        return $("<section>", {
            class: "guest-detail",
            "data-guest-id": guest.id,
            role: "dialog",
            "aria-label": guest.name + " information"
        }).append($content);
    }

    function openGuestDetail(guestId) {
        if (movingGuestIds.has(guestId)) {
            return;
        }

        if ($openDetail !== null) {
            if (openGuestId === guestId && !detailIsClosing) {
                return;
            }

            pendingGuestId = guestId;
            closeGuestDetail();
            return;
        }

        const guestRecord = findGuestInData(guestId);

        if (guestRecord === null) {
            return;
        }

        const $guest =
            $('.guest[data-guest-id="' + guestId + '"]').first();

        const $avatar = $guest.find(".avatar-frame");
        const startPosition = $avatar.offset();

        if (!startPosition) {
            return;
        }

        const startWidth = $avatar.outerWidth();
        const startHeight = $avatar.outerHeight();

        const targetWidth = Math.min(410, window.innerWidth - 32);
        const targetHeight = Math.min(510, window.innerHeight - 40);

        const targetLeft =
            window.pageXOffset +
            Math.max(16, (window.innerWidth - targetWidth) / 2);

        const targetTop =
            window.pageYOffset +
            Math.max(20, (window.innerHeight - targetHeight) / 2);

        $openDetail = createDetailCard(guestRecord);
        openGuestId = guestId;
        detailIsClosing = false;

        const $content =
            $openDetail.find(".guest-detail-content").hide();

        $openDetail
            .css({
                top: startPosition.top,
                left: startPosition.left,
                width: startWidth,
                height: startHeight,
                opacity: 0.25
            })
            .appendTo("body")
            .stop(true, false)
            .animate(
                {
                    top: targetTop,
                    left: targetLeft,
                    width: targetWidth,
                    height: targetHeight,
                    opacity: 1
                },
                420,
                function () {
                    $content.fadeIn(180);
                }
            );
    }

    function closeGuestDetail(callback) {
        if (typeof callback === "function") {
            afterCloseAction = callback;
        }

        if ($openDetail === null) {
            const action = afterCloseAction;
            afterCloseAction = null;

            if (action !== null) {
                action();
            }

            return;
        }

        if (detailIsClosing) {
            return;
        }

        detailIsClosing = true;

        const closingGuestId = openGuestId;
        const $detailToClose = $openDetail;

        const $guest =
            $('.guest[data-guest-id="' + closingGuestId + '"]').first();

        $detailToClose
            .find(".guest-detail-content")
            .stop(true, true)
            .hide();

        if ($guest.length === 0) {
            finishDetailClose($detailToClose);
            return;
        }

        const $avatar = $guest.find(".avatar-frame");
        const targetPosition = $avatar.offset();

        if (!targetPosition) {
            finishDetailClose($detailToClose);
            return;
        }

        $detailToClose
            .stop(true, false)
            .animate(
                {
                    top: targetPosition.top,
                    left: targetPosition.left,
                    width: $avatar.outerWidth(),
                    height: $avatar.outerHeight(),
                    opacity: 0.2
                },
                350,
                function () {
                    finishDetailClose($detailToClose);
                }
            );
    }

    function finishDetailClose($detailToClose) {
        $detailToClose.remove();

        $openDetail = null;
        openGuestId = null;
        detailIsClosing = false;

        const action = afterCloseAction;
        afterCloseAction = null;

        if (action !== null) {
            action();
            return;
        }

        if (pendingGuestId !== null) {
            const nextGuestId = pendingGuestId;
            pendingGuestId = null;
            openGuestDetail(nextGuestId);
        }
    }

    function closeDetailImmediately() {
        if ($openDetail !== null) {
            $openDetail.stop(true, true).remove();
        }

        $openDetail = null;
        openGuestId = null;
        detailIsClosing = false;
        pendingGuestId = null;
        afterCloseAction = null;
    }





    function moveGuest(guestId, targetRoomId) {
        if (movingGuestIds.has(guestId)) {
            return;
        }

        const guestRecord = findGuestInData(guestId);

        if (
            guestRecord === null ||
            guestRecord.room.id === targetRoomId
        ) {
            return;
        }

        const targetRoom = getRoomData(targetRoomId);

        if (!targetRoom) {
            return;
        }

        const sourceRoomId = guestRecord.room.id;
        const guestData = guestRecord.guest;

        const $sourceGuest =
            $('.guest[data-guest-id="' + guestId + '"]').first();

        const $targetList =
            $('.room[data-room="' + targetRoomId + '"] .guest-list');

        if ($sourceGuest.length === 0 || $targetList.length === 0) {
            return;
        }

        movingGuestIds.add(guestId);
        clearSpotlight(false);

        const sourcePosition = $sourceGuest.offset();

        const sourceWidth = $sourceGuest.outerWidth();
        const sourceHeight = $sourceGuest.outerHeight();

        const $flyingGuest =
            $sourceGuest
                .clone()
                .removeClass("spotlight-match found")
                .addClass("flying-guest")
                .css({
                    top: sourcePosition.top,
                    left: sourcePosition.left,
                    width: sourceWidth,
                    height: sourceHeight,
                    opacity: 1
                })
                .appendTo("body");

        guestRecord.room.guests.splice(guestRecord.guestIndex, 1);

        const greatestPictureOrder =
            targetRoom.guests.reduce(function (greatest, guest) {
                return Math.max(greatest, guest.pictureOrder);
            }, -1);

        guestData.pictureOrder = greatestPictureOrder + 1;

        targetRoom.guests.push(guestData);

        const $newCard =
            createGuestCard(guestData)
                .addClass("guest-being-moved")
                .css({
                    width: 0,
                    minWidth: 0,
                    paddingLeft: 0,
                    paddingRight: 0,
                    opacity: 0
                })
                .appendTo($targetList);

        $sourceGuest
            .addClass("guest-being-moved")
            .stop(true, false)
            .animate(
                {
                    width: 0,
                    minWidth: 0,
                    paddingLeft: 0,
                    paddingRight: 0,
                    opacity: 0
                },
                400,
                function () {
                    $(this).remove();
                    updateRoomCount(sourceRoomId);
                }
            );

        $newCard
            .stop(true, false)
            .animate(
                {
                    width: 78,
                    minWidth: 0,
                    paddingLeft: 4,
                    paddingRight: 4
                },
                400,
                function () {
                    const destination = $newCard.offset();

                    $flyingGuest
                        .stop(true, false)
                        .animate(
                            {
                                top: destination.top,
                                left: destination.left,
                                width: $newCard.outerWidth(),
                                height: $newCard.outerHeight()
                            },
                            650,
                            function () {
                                $flyingGuest.remove();

                                $newCard
                                    .removeClass("guest-being-moved")
                                    .css({
                                        width: "",
                                        minWidth: "",
                                        height: "",
                                        paddingLeft: "",
                                        paddingRight: "",
                                        overflow: "",
                                        opacity: 0
                                    })
                                    .fadeTo(250, 1);

                                movingGuestIds.delete(guestId);
                                updateRoomCount(targetRoomId);
                            }
                        );
                }
            );
    }

 


    function sortRoom(roomId) {
        const $room =
            $('.room[data-room="' + roomId + '"]');

        const $guestList = $room.find(".guest-list");
        const $cards = $guestList.children(".guest");

        if ($cards.length < 2) {
            return;
        }

       



        $cards
            .stop(true, true)
            .css({
                top: 0,
                left: 0
            });

        const oldPositions = new Map();

        $cards.each(function () {
            oldPositions.set(this, $(this).offset());
        });

        const currentlySortedByTime =
            roomSortState[roomId] === "time";

        const nextMode = currentlySortedByTime
            ? "picture"
            : "time";

        const sortedElements = $cards.get().sort(function (first, second) {
            if (nextMode === "time") {
                return first.dataset.arrival.localeCompare(
                    second.dataset.arrival
                );
            }

            return (
                Number(first.dataset.pictureOrder) -
                Number(second.dataset.pictureOrder)
            );
        });

        sortedElements.forEach(function (element) {
            $guestList.append(element);
        });

        sortedElements.forEach(function (element) {
            const oldPosition = oldPositions.get(element);
            const newPosition = $(element).offset();

            $(element)
                .css({
                    left: oldPosition.left - newPosition.left,
                    top: oldPosition.top - newPosition.top
                })
                .stop(true, false)
                .animate(
                    {
                        left: 0,
                        top: 0
                    },
                    600
                );
        });

        roomSortState[roomId] = nextMode;

        $room.find(".sort-button").text(
            nextMode === "time"
                ? "Picture order"
                : "Sort by time"
        );
    }

  




    $("#case-buttons").on("click", ".case-button", function () {
        runCase(Number(this.dataset.case));
    });

    $("#clear-spotlight").on("click", function () {
        clearSpotlight(true);
    });

    $("#reset-party").on("click", function () {
        $(".guest, .guest-detail, .flying-guest").stop(true, true);

        movingGuestIds.clear();

        partyState = preparePartyData(
            copyObject(originalPartyData)
        );

        renderParty();
    });

    $("#house").on("click", ".guest", function (event) {
        event.stopPropagation();
        openGuestDetail(this.dataset.guestId);
    });

    $("#house").on("keydown", ".guest", function (event) {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            event.stopPropagation();
            openGuestDetail(this.dataset.guestId);
        }
    });

    $("#house").on("click", ".sort-button", function (event) {
        event.stopPropagation();
        sortRoom(this.dataset.room);
    });

    $(document).on("click", ".guest-detail", function (event) {
        event.stopPropagation();
    });

    $(document).on("click", ".move-button", function (event) {
        event.stopPropagation();

        const guestId = this.dataset.guestId;
        const targetRoomId = this.dataset.targetRoom;

        pendingGuestId = null;

        closeGuestDetail(function () {
            moveGuest(guestId, targetRoomId);
        });
    });

    $(document).on("click", function (event) {
        if (
            $openDetail !== null &&
            $(event.target).closest(".guest-detail, .guest").length === 0
        ) {
            pendingGuestId = null;
            closeGuestDetail();
        }
    });

    $(document).on("keydown", function (event) {
        if (event.key === "Escape" && $openDetail !== null) {
            pendingGuestId = null;
            closeGuestDetail();
        }
    });

    renderCaseButtons();
    renderParty();
});