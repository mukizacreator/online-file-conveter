/*
====================================================
PROFILE PAGE SCRIPT
====================================================
*/

/*
----------------------------------------------------
Get logged-in user
----------------------------------------------------
*/

const loggedInEmail =
  localStorage.getItem(
    "loggedInUser"
  );

if (!loggedInEmail) {
  window.location.href =
    "signin.html";
}

/*
----------------------------------------------------
Load users
----------------------------------------------------
*/

let users =
  JSON.parse(
    localStorage.getItem(
      "users"
    )
  ) || [];

let currentUser =
  users.find(
    (u) =>
      u.email ===
      loggedInEmail
  );

if (!currentUser) {

  localStorage.removeItem(
    "loggedInUser"
  );

  window.location.href =
    "signin.html";
}

/*
====================================================
Get page elements
====================================================
*/

const profileImage =
  document.getElementById(
    "profileImage"
  );

const profilePhotoInput =
  document.getElementById(
    "profilePhotoInput"
  );

const profileUsername =
  document.getElementById(
    "profileUsername"
  );

const profileEmail =
  document.getElementById(
    "profileEmail"
  );

const profileUsernameInput =
  document.getElementById(
    "profileUsernameInput"
  );

const profileMessage =
  document.getElementById(
    "profileMessage"
  );

const accountPanel =
  document.getElementById(
    "accountPanel"
  );

const securityPanel =
  document.getElementById(
    "securityPanel"
  );

/*
====================================================
Load user information
====================================================
*/

function loadUserData() {

  profileUsername.textContent =
    currentUser.username;

  profileEmail.value =
    currentUser.email;

  profileUsernameInput.value =
    currentUser.username;

  if (
    currentUser.photo
  ) {
    profileImage.src =
      currentUser.photo;
  }
}

loadUserData();

/*
====================================================
Profile photo upload
====================================================
*/

profilePhotoInput.addEventListener(
  "change",
  function () {

    const file =
      this.files[0];

    if (!file) {
      return;
    }

    const reader =
      new FileReader();

    reader.onload =
      function (
        event
      ) {

        profileImage.src =
          event.target.result;

        currentUser.photo =
          event.target.result;

        localStorage.setItem(
          "users",
          JSON.stringify(
            users
          )
        );
      };

    reader.readAsDataURL(
      file
    );
  }
);

/*
====================================================
Save account changes
====================================================
*/

document
  .getElementById(
    "saveAccountBtn"
  )
  .addEventListener(
    "click",
    () => {

      const newEmail =
        profileEmail.value
          .trim()
          .toLowerCase();

      const newUsername =
        profileUsernameInput.value
          .trim();

      if (
        !newEmail ||
        !newUsername
      ) {

        profileMessage.innerHTML =
          `
          <p style="color:#ff9d9d;">
            Please complete all fields.
          </p>
          `;

        return;
      }

      const exists =
        users.some(
          (user) =>
            user.email ===
              newEmail &&
            user !==
              currentUser
        );

      if (exists) {

        profileMessage.innerHTML =
          `
          <p style="color:#ff9d9d;">
            Email already belongs
            to another account.
          </p>
          `;

        return;
      }

      currentUser.email =
        newEmail;

      currentUser.username =
        newUsername;

      localStorage.setItem(
        "users",
        JSON.stringify(
          users
        )
      );

      localStorage.setItem(
        "loggedInUser",
        newEmail
      );

      profileUsername.textContent =
        newUsername;

      profileMessage.innerHTML =
        `
        <p style="color:#9fff9f;">
          Account updated successfully.
        </p>
        `;
    }
  );

/*
====================================================
Tabs
====================================================
*/

document
  .getElementById(
    "accountTab"
  )
  .addEventListener(
    "click",
    (
      e
    ) => {

      e.preventDefault();

      accountPanel.style.display =
        "block";

      securityPanel.style.display =
        "none";
    }
  );

document
  .getElementById(
    "securityTab"
  )
  .addEventListener(
    "click",
    (
      e
    ) => {

      e.preventDefault();

      accountPanel.style.display =
        "none";

      securityPanel.style.display =
        "block";
    }
  );

/*
====================================================
Change password
====================================================
*/

document
  .getElementById(
    "changePasswordBtn"
  )
  .addEventListener(
    "click",
    async () => {

      const currentPassword =
        document.getElementById(
          "currentPassword"
        ).value;

      const newPassword =
        document.getElementById(
          "newPassword"
        ).value;

      const confirmPassword =
        document.getElementById(
          "confirmPassword"
        ).value;

      if (
        currentPassword !==
        currentUser.password
      ) {

        profileMessage.innerHTML =
          `
          <p style="color:#ff9d9d;">
            Incorrect current password.
          </p>
          `;

        return;
      }

      if (
        !newPassword
      ) {

        profileMessage.innerHTML =
          `
          <p style="color:#ff9d9d;">
            Please enter a new password.
          </p>
          `;

        return;
      }

      if (
        newPassword !==
        confirmPassword
      ) {

        profileMessage.innerHTML =
          `
          <p style="color:#ff9d9d;">
            Passwords do not match.
          </p>
          `;

        return;
      }

      try {

        const response =
          await fetch(
            "/api/send-code",
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body:
                JSON.stringify(
                  {
                    email:
                      currentUser.email
                  }
                )
            }
          );

        if (
          !response.ok
        ) {
          throw new Error();
        }

        const code =
          prompt(
            "A verification code has been sent to your email.\n\nEnter the code:"
          );

        if (
          !code
        ) {
          return;
        }

        const verifyResponse =
          await fetch(
            "/api/verify-code",
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body:
                JSON.stringify(
                  {
                    email:
                      currentUser.email,

                    code
                  }
                )
            }
          );

        const verifyData =
          await verifyResponse.json();

        if (
          !verifyData.success
        ) {

          profileMessage.innerHTML =
            `
            <p style="color:#ff9d9d;">
              Incorrect verification code.
            </p>
            `;

          return;
        }

        currentUser.password =
          newPassword;

        localStorage.setItem(
          "users",
          JSON.stringify(
            users
          )
        );

        document.getElementById(
          "currentPassword"
        ).value = "";

        document.getElementById(
          "newPassword"
        ).value = "";

        document.getElementById(
          "confirmPassword"
        ).value = "";

        profileMessage.innerHTML =
          `
          <p style="color:#9fff9f;">
            Password changed successfully.
          </p>
          `;

      } catch {

        profileMessage.innerHTML =
          `
          <p style="color:#ff9d9d;">
            Failed to send verification email.
          </p>
          `;
      }
    }
  );

/*
====================================================
Logout
====================================================
*/

document
  .getElementById(
    "logoutBtn"
  )
  .addEventListener(
    "click",
    () => {

      localStorage.removeItem(
        "loggedInUser"
      );

      window.location.href =
        "index.html";
    }
  );

/*
====================================================
Delete account
====================================================
*/

document
  .getElementById(
    "deleteAccountBtn"
  )
  .addEventListener(
    "click",
    async () => {

      const confirmed =
        confirm(
          "Are you sure you want to permanently delete your account?"
        );

      if (
        !confirmed
      ) {
        return;
      }

      try {

        const response =
          await fetch(
            "/api/send-code",
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body:
                JSON.stringify(
                  {
                    email:
                      currentUser.email
                  }
                )
            }
          );

        if (
          !response.ok
        ) {
          throw new Error();
        }

        const code =
          prompt(
            "A verification code has been sent to your email.\n\nEnter the code:"
          );

        if (
          !code
        ) {
          return;
        }

        const verifyResponse =
          await fetch(
            "/api/verify-code",
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body:
                JSON.stringify(
                  {
                    email:
                      currentUser.email,

                    code
                  }
                )
            }
          );

        const verifyData =
          await verifyResponse.json();

        if (
          !verifyData.success
        ) {

          profileMessage.innerHTML =
            `
            <p style="color:#ff9d9d;">
              Incorrect verification code.
            </p>
            `;

          return;
        }

        users =
          users.filter(
            (u) =>
              u.email !==
              currentUser.email
          );

        localStorage.setItem(
          "users",
          JSON.stringify(
            users
          )
        );

        localStorage.removeItem(
          "loggedInUser"
        );

        alert(
          "Account deleted successfully."
        );

        window.location.href =
          "index.html";

      } catch {

        profileMessage.innerHTML =
          `
          <p style="color:#ff9d9d;">
            Failed to send verification email.
          </p>
          `;
      }
    }
  );