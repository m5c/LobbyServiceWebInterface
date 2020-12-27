/**
 * Helper functions for anything login / token related.
 */

/**
 * Prefills the username field and preselects password field in case the information is present in a cookie
 */
function preFillUserNameField() {
    let username = readCookie('user-name');
    if (username) {
        $('#user-name-field').val(username);
        $('#password-field').focus();
    }
}

/**
 * Assigns the credential based token retrieval function a click on login / enter press.
 */
function registerLoginHandler() {

    // register enter press on password field
    $('#password-field').keypress(function (event) {
        let keycode = (event.keyCode ? event.keyCode : event.which);
        if (keycode == '13') {
            login();
        }
    });

    // register click on login button
    $('#loginButton').on('click', login);
}

/**
 * Retrieves an OAuth2 token pair using the provided credentials. On success the token is stored in a cookie and the user is redirected to the main menu.
 */
function login() {

    // read out login data from input fields
    let username = document.getElementById('user-name-field').value.toLowerCase();
    let password = document.getElementById('password-field').value;

    // disable button until login attempt is finished
    $('#loginButton').prop("disabled", "true");

    // Lobby Service authentication meta-parameters and HTTP method
    const init = {
        body: "grant_type=password&username="+username+"&password="+password,
        headers: {
            Authorization: "Basic YmdwLWNsaWVudC1uYW1lOmJncC1jbGllbnQtcHc=", // echo -n "bgp-client-name:bgp-client-pw" | base64
            "Content-Type": "application/x-www-form-urlencoded"
        },
        method: "POST"
    };

    // Actually retrieves tokens from API. On success stores them in session cookie and redirects to main menu. On failure displays an alert an reloads the page.
    fetch('/oauth/token', init)
        .then(result => result.json())  // returns a new promise, containing the parsed response (Even in case of bad credentials, a parse-able json is returned. no error handling needed here.)
        .then(json => {
            // If the LS rejected the credentials:
            if (json.error) {
                alert(json.error_description);
                location.reload();
            }
            // Else, if the credentials were accepted (token in JSON reply)
            else {
                persistLogin(username, json.access_token, json.refresh_token);
                forwardToLanding();
            }
        })
    // Apparently not possible to force DOM update from promise finally. Therefore redirect to same page and fore reload if bad credentials.

}

/**
 * Redirects an authenticated user to the principal menu.
 * For admins, this is eht user management panel
 * For players this is the lobby
 */
function forwardToLanding()
{
    // Determine whether logged in user is admin or player
    fetch('/oauth/role?access_token='+getAccessToken())
        .then(result => result.json())
        .then(json => {
            // Redirect players to session panel, admins to user management panel
            if( json[0].authority === 'ROLE_PLAYER')
                window.location.href = "/lobby.html";
            else
                window.location.href = "/admin.html";
        })
}


/**
 * Saves the access and refresh token in a session cookie.
 */
function persistLogin(username, access_token, refresh_token) {

    // escape occurrences of '+' in tokens by '%2B', so they can be safely used as URL params from here on.
    access_token = access_token.replace(/\+/g, "%2B");
    refresh_token = refresh_token.replace(/\+/g, "%2B");

    // log and persist credential data
    console.log("Username: " + username);
    console.log("Access Token: " + access_token);
    console.log("Refresh Token: " + refresh_token);
    document.cookie = "user-name=" + username;
    document.cookie = "access-token=" + access_token;
    document.cookie = "refresh-token=" + refresh_token;
}

/**
 * Verifies whether the current session cookie contains username, acces-token and renewal-token
 */
function isLoginOk() {
    let username = readCookie('user-name');
    let access_token = readCookie('access-token');
    let refresh_token = readCookie('refresh-token');

    // evaluates to true if all strings properly set in cookie
    return username && access_token && refresh_token;
}

/**
 * Redirects all non-authenticated users to the login page.
 */
function anonymousIntercept() {
    if (!isLoginOk())
        window.location.replace("/");
}

function getUserName() {
    return readCookie('user-name');
}

function getAccessToken() {
    return readCookie('access-token');
}

function getRefreshToken() {
    return readCookie('refresh-token');
}

/**
 * Deletes the tokens from the cookie, keeps the username. Then reloads the page (forces redirect to login if protected page.).
 */
function logout() {
    document.cookie = "access-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "refresh-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    location.reload();
}
