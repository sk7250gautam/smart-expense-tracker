document.addEventListener("DOMContentLoaded", function () {

    // Smooth scrolling
    document.documentElement.style.scrollBehavior = "smooth";


    // Automatically set today's date in date fields
    const dateInputs = document.querySelectorAll('input[type="date"]');

    const today = new Date();

    const year = today.getFullYear();

    const month = String(today.getMonth() + 1).padStart(2, "0");

    const day = String(today.getDate()).padStart(2, "0");

    const todayString = `${year}-${month}-${day}`;


    dateInputs.forEach(function (input) {

        if (!input.value) {
            input.value = todayString;
        }

    });


    // Confirm delete buttons
    const deleteButtons =
        document.querySelectorAll(".delete-btn");

    deleteButtons.forEach(function (button) {

        button.addEventListener("click", function (event) {

            const confirmed =
                confirm("Are you sure you want to delete this transaction?");

            if (!confirmed) {
                event.preventDefault();
            }

        });

    });


    // Amount validation
    const amountInputs =
        document.querySelectorAll('input[name="amount"]');

    amountInputs.forEach(function (input) {

        input.addEventListener("input", function () {

            if (Number(input.value) < 0) {
                input.value = 0;
            }

        });

    });


    // Prevent accidental double submission
    const forms = document.querySelectorAll("form");

    forms.forEach(function (form) {

        form.addEventListener("submit", function () {

            const submitButton =
                form.querySelector('button[type="submit"]');

            if (submitButton) {

                submitButton.disabled = true;

                submitButton.style.opacity = "0.7";

                submitButton.innerText = "Saving...";

            }

        });

    });

});