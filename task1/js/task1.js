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
        17: "Who stands first in each room?",
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
            '.filter(time and adjacent ATU student)'
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
            "aria-label": guest.name
        }).attr({
            "data-name": guest.name,
            "data-color": guest.color,
            "data-arrival": guest.arrival,
            "data-atu": String(guest.atu),
            "data-items": allItems.join(","),
            "data-birthday": String(Boolean(guest.birthday))
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
        const $house = $("#house").empty();

        [2, 1].forEach(function (floorNumber) {
            const roomsOnFloor = PARTY_DATA.rooms.filter(function (room) {
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
                    "data-room-name": room.name,
                    "data-guest-count": room.guests.length
                });

                const $roomTitle = $("<div>", {
                    class: "room-title"
                }).append(
                    $("<h3>", {
                        text: room.name
                    }),
                    $("<span>", {
                        class: "room-count",
                        text: room.guests.length + " guests"
                    })
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

        resetResult();
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

    function resetResult() {
        $("#result-title").text("Choose a case");

        $("#result-text").text(
            "The matching guests or rooms will be highlighted."
        );

        $("#selector-used").text("—");

        document.querySelectorAll(".case-button").forEach(function (button) {
            button.classList.remove("active");
        });
    }

    function setActiveButton(caseNumber) {
        document.querySelectorAll(".case-button").forEach(function (button) {
            const isActive =
                Number(button.dataset.case) === Number(caseNumber);

            button.classList.toggle("active", isActive);
        });
    }

    function jumpOnce($guests) {
        $guests
            .stop(true, true)
            .css("top", 0)
            .animate({ top: -15 }, 180)
            .animate({ top: 0 }, 180);
    }




    function reportMatches($found, resultType) {
        const elements = Array.from($found);

        if (elements.length === 0) {
            $("#result-title").text("No matches");

            $("#result-text").text(
                "No guest or room matched this detective case."
            );

            return;
        }

        let labels;
        let $guestsToAnimate;

        if (resultType === "room") {
            $found.addClass("found");

            labels = elements.map(function (room) {
                return room.dataset.roomName;
            });

            $guestsToAnimate = $found.find(".guest").addClass("found");
        } else {
            $found.addClass("found");

            labels = elements.map(function (guest) {
                return guest.dataset.name;
            });

            $guestsToAnimate = $found;
        }

        const itemName = resultType === "room"
            ? (elements.length === 1 ? "room" : "rooms")
            : (elements.length === 1 ? "guest" : "guests");

        $("#result-title").text(
            elements.length + " " + itemName + " found"
        );

        $("#result-text").text(labels.join(", "));

        jumpOnce($guestsToAnimate);
    }

  
    





    function runCase(caseNumber) {
      



        renderParty();
        setActiveButton(caseNumber);

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
              




                $found =
                    $('.guest[data-name="Askar"]')
                        .after(createGuestCard(LATE_GUEST).hide())
                        .next(".guest")
                        .fadeIn(500, function () {
                            reportMatches($found, "guest");
                        });

                return;

            case 19:
                $found =
                    $('.guest[data-name="Natasha"]');

                reportMatches($found, "guest");

             





                $found
                    .delay(450)
                    .fadeOut(500, function () {
                        $(this).remove();
                    });

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
                                PARTY_DATA.cakeDisappearedAt &&
                            (previousIsAtu || nextIsAtu)
                        );
                    });
                break;

            default:
                return;
        }

        reportMatches($found, resultType);
    }

    $("#case-buttons").on("click", ".case-button", function () {
        runCase(Number(this.dataset.case));
    });

    $("#reset-party").on("click", function () {
        renderParty();
    });

    renderCaseButtons();
    renderParty();
});