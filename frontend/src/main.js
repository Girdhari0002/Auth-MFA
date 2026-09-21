import { api, API_BASE, escapeHtml } from "./api/client.js";
import { state } from "./state/store.js";

const app = document.querySelector("#app");
const modeButtons = document.querySelectorAll(".mode-button");
function progress(active, total = 4) {
  return `<div class="progress">${Array.from({ length: total }, (_, i) => `<div class="step ${i + 1 <= active ? "active" : ""}"><span class="step-dot">${i + 1}</span></div>${i < total - 1 ? '<span class="step-line"></span>' : ""}`).join("")}</div>`;
}
function render() {
  const screens = { login: loginScreen, "login-method": methodScreen, "login-otp": () => otpScreen("login"), register: registerScreen, "register-email": () => otpScreen("email"), "register-sms": () => otpScreen("sms"), mfa: mfaScreen, success: successScreen, dashboard: dashboardScreen };
  app.innerHTML = `${progress(state.screen === "login" ? 1 : state.screen === "register" ? 1 : state.screen === "success" ? 4 : 2, state.mode === "register" ? 4 : 3)}${screens[state.screen]()}`;
  wire();
}
function loginScreen() {
  return `<section class="screen"><div class="icon-circle">♜</div><h2>Welcome back!</h2><p class="subhead">Login to your account</p><form id="login-form"><div class="field"><label>Email or Username</label><input name="identifier" autocomplete="username" required placeholder="you@example.com" /></div><div class="field" style="margin-top:14px"><label>Password</label><div class="password-wrap"><input name="password" type="password" autocomplete="current-password" required placeholder="Enter your password" /><button type="button" class="toggle-password">◉</button></div></div><div class="remember-row"><label><input type="checkbox" name="remember" /> Remember me</label><span class="link">Forgot password?</span></div><div id="form-alert"></div><button class="primary">Login</button></form><div class="divider">or</div><button class="secondary google-button" id="google-login"><span class="google-logo">G</span> Continue with Google</button><p class="switch-copy">New here? <span class="link" data-switch="register">Create an account</span></p></section>`;
}
function registerScreen() {
  return `<section class="screen"><h2>Create your account</h2><p class="subhead">Let's get you started</p><form id="register-form"><div class="form-grid"><div class="field full"><label>Full Name</label><input name="fullName" required placeholder="Priya Sharma" /></div><div class="field full"><label>Email</label><input name="email" type="email" required placeholder="priya.sharma@email.com" /></div><div class="field"><label>Mobile Number</label><input name="phone" required placeholder="+91 98765 43210" /></div><div class="field"><label>Password</label><div class="password-wrap"><input name="password" type="password" required placeholder="••••••••••" /><button type="button" class="toggle-password">◉</button></div></div></div><div class="rules"><p>Password must contain:</p><span class="rule">At least 8 characters</span><span class="rule">1 uppercase letter</span><span class="rule">1 number</span><span class="rule">1 special character</span></div><label class="consent"><input name="consent" type="checkbox" required /> I agree to the <span class="link">Terms & Conditions</span> and <span class="link">Privacy Policy</span></label><div id="form-alert"></div><button class="primary">Create Account</button></form><p class="switch-copy">Already have an account? <span class="link" data-switch="login">Login</span></p></section>`;
}
function otpScreen(channel) {
  const isAuth = state.selectedLoginMethod === "authenticator";
  const isSms = state.selectedLoginMethod === "sms" || channel === "sms";
  const title = isAuth ? "Authenticator Verification" : isSms ? "Verify your mobile" : "Verify your email";
  const target = isAuth ? "your authenticator app" : isSms ? state.userPhone : state.userEmail;
  return `<section class="screen center"><div class="icon-circle ${state.lastError ? "error" : ""}">${isAuth ? "♙" : isSms ? "⌕" : "✉"}</div><h2>${title}</h2><p class="subhead">${isAuth ? "Enter the 6-digit code from" : "We have sent a 6-digit code to"}<br /><strong>${escapeHtml(target)}</strong></p><div class="otp">${Array.from({ length: 6 }, (_, i) => `<input maxlength="1" inputmode="numeric" data-index="${i}" ${state.lastError ? "class='invalid'" : ""} />`).join("")}</div>${state.lastError ? `<div class="alert">${escapeHtml(state.lastError)}</div>` : ""}<p class="timer">${isAuth ? "Code refreshes every 30 seconds" : "Code expires in"} <strong>${isAuth ? "" : "02:45"}</strong></p>${!isAuth ? '<button class="resend" id="resend">Resend code</button>' : ""}<p class="hint">${isAuth ? "Use Google Authenticator or Authy." : "Didn't receive the code?"}</p><div class="form-actions"><button class="primary" id="verify-otp">Verify code</button></div></section>`;
}
function methodScreen() {
  const enabled = (id) => state.loginMethods?.find((item) => item.id === id)?.enabled === true;
  const card = (id, icon, title, description) => `<div class="method ${state.selectedLoginMethod === id ? "selected" : ""}" data-method="${id}" data-enabled="${enabled(id)}" aria-disabled="${!enabled(id)}" style="${enabled(id) ? "" : "opacity:.5;cursor:not-allowed"}"><span class="method-icon">${icon}</span><div><b>${title}</b><small>${description}</small></div><span class="radio"></span></div>`;
  return `<section class="screen center"><div class="icon-circle">♜</div><h2>Verify your identity</h2><p class="subhead">Choose a method to continue</p><div class="method-list">${card("email", "✉", "Email OTP", "Receive a code on your email")}${card("sms", "▣", "SMS OTP", "Receive a code on your mobile")}${card("authenticator", "♙", "Authenticator App", "Use code from authenticator app")}</div>${state.lastError ? `<div class="alert">${escapeHtml(state.lastError)}</div>` : ""}<button class="primary" id="continue-method">Continue</button></section>`;
}
function mfaScreen() {
  if (state.setupUri) {
    return `<section class="screen center"><div class="icon-circle">♜</div><h2>Scan QR Code</h2><p class="subhead">Open your authenticator app and scan this QR code.</p><img class="qr-image" src="${state.qrDataUrl}" alt="Authenticator setup QR code" /><p class="hint">Can't scan? <button class="resend" id="show-setup-key">Enter setup key</button></p><div id="setup-key" class="setup-key" hidden>${escapeHtml(state.setupUri.split("secret=")[1].split("&")[0])}</div><div class="field mfa-code-field"><label>6-digit authenticator code</label><input id="mfa-code" inputmode="numeric" maxlength="6" placeholder="000000" /></div><div id="mfa-alert"></div><button class="primary" id="mfa-complete">Verify and create account</button></section>`;
  }
  return `<section class="screen center"><div class="icon-circle">♜</div><h2>Set up Multi-Factor Auth</h2><p class="subhead">Add an extra layer of security to protect your account.</p><div class="method-list"><div class="method selected"><span class="method-icon">◉</span><div><b>Authenticator App</b><small>Google Authenticator / Authy</small></div><span class="radio"></span></div><div class="method"><span class="method-icon">▣</span><div><b>SMS Authentication</b><small>Receive codes on your mobile</small></div><span class="radio"></span></div></div><button class="primary" id="mfa-continue">Continue</button></section>`;
}
function successScreen() {
  return `<section class="screen center"><div class="icon-circle success">✓</div><h2>Account created!</h2><p class="subhead">Your account has been created<br />successfully and MFA is enabled.</p><ul class="success-list"><li>Email verified</li><li>Mobile verified</li><li>MFA enabled</li></ul><button class="primary" data-switch="login">Continue to Login</button></section>`;
}
function dashboardScreen() {
  return `<section class="screen center"><div class="icon-circle success">✓</div><h2>You're signed in!</h2><p class="subhead">Welcome back to SecureID.<br />Your account is protected with MFA.</p><ul class="success-list"><li>Identity verified</li><li>Secure session created</li><li>MFA challenge complete</li></ul><button class="secondary" data-switch="login">Sign out</button></section>`;
}
function showAlert(message) { const target = document.querySelector("#form-alert"); if (target) target.innerHTML = `<div class="alert">${escapeHtml(message)}</div>`; }
function wire() {
  document.querySelectorAll("[data-switch]").forEach((el) => el.addEventListener("click", () => { state.mode = el.dataset.switch; state.screen = el.dataset.switch; state.lastError = ""; render(); }));
  document.querySelectorAll(".toggle-password").forEach((button) => button.addEventListener("click", () => { const input = button.previousElementSibling; input.type = input.type === "password" ? "text" : "password"; }));
  const register = document.querySelector("#register-form");
  if (register) register.addEventListener("submit", async (event) => { event.preventDefault(); const data = Object.fromEntries(new FormData(register)); try { const result = await api("/api/register", { method:"POST", body:JSON.stringify(data) }); state.pendingId = result.pendingId; state.challengeId = result.challengeId; state.userEmail = data.email; state.userPhone = data.phone; state.screen = "register-email"; render(); } catch (error) { showAlert(error.message); } });
  const login = document.querySelector("#login-form");
  const googleLogin = document.querySelector("#google-login");
  if (googleLogin) googleLogin.addEventListener("click", () => { window.location.href = `${API_BASE}/api/auth/google`; });
  if (login) login.addEventListener("submit", async (event) => { event.preventDefault(); const data = Object.fromEntries(new FormData(login)); try { const result = await api("/api/login", { method:"POST", body:JSON.stringify(data) }); state.loginIdentifier = data.identifier; state.loginMethods = result.methods; state.selectedLoginMethod = result.methods.find((method) => method.enabled)?.id || null; state.userEmail = data.identifier; state.userPhone = result.phone || ""; state.screen = "login-method"; render(); } catch (error) { showAlert(error.message); } });
  document.querySelectorAll(".method").forEach((method) => method.addEventListener("click", () => {
    if (method.dataset.enabled !== "true") return;
    state.selectedLoginMethod = method.dataset.method;
    document.querySelectorAll(".method").forEach((item) => item.classList.toggle("selected", item === method));
  }));
  const continueMethod = document.querySelector("#continue-method");
  if (continueMethod) continueMethod.addEventListener("click", async () => {
    const method = state.selectedLoginMethod || "email";
    try {
      if (method === "authenticator") {
        state.screen = "login-otp";
      } else {
        const result = await api("/api/login/challenge", { method: "POST", body: JSON.stringify({ identifier: state.loginIdentifier, method }) });
        state.challengeId = result.challengeId;
        state.screen = "login-otp";
      }
      render();
    } catch (error) { state.lastError = error.message; render(); }
  });
  const mfaContinue = document.querySelector("#mfa-continue");
  if (mfaContinue) mfaContinue.addEventListener("click", async () => {
    try {
      const result = await api("/api/setup-mfa", { method: "POST", body: JSON.stringify({ pendingId: state.pendingId }) });
      state.setupUri = result.setupUri;
      state.qrDataUrl = result.qrDataUrl;
      render();
    } catch (error) {
      state.lastError = error.message;
      render();
    }
  });
  const setupKey = document.querySelector("#show-setup-key");
  if (setupKey) setupKey.addEventListener("click", () => { document.querySelector("#setup-key").hidden = false; });
  const mfaComplete = document.querySelector("#mfa-complete");
  if (mfaComplete) mfaComplete.addEventListener("click", async () => {
    const code = document.querySelector("#mfa-code").value.trim();
    try {
      await api("/api/verify-mfa", { method: "POST", body: JSON.stringify({ pendingId: state.pendingId, code }) });
      state.screen = "success";
      render();
    } catch (error) {
      const target = document.querySelector("#mfa-alert");
      if (target) target.innerHTML = `<div class="alert">${escapeHtml(error.message)}</div>`;
    }
  });
  document.querySelectorAll(".otp input").forEach((input, index, inputs) => input.addEventListener("input", () => { if (input.value && inputs[index + 1]) inputs[index + 1].focus(); }));
  const verify = document.querySelector("#verify-otp");
  if (verify) verify.addEventListener("click", async () => {
    const code = [...document.querySelectorAll(".otp input")].map((input) => input.value).join("");
    if (code.length !== 6) {
      state.lastError = "Enter the complete 6-digit code.";
      render();
      return;
    }
    const endpoint = state.screen === "login-otp" ? "/api/verify-login-otp" : state.screen === "register-email" ? "/api/verify-email-otp" : "/api/verify-sms-otp";
    try {
      const result = await api(endpoint, { method:"POST", body:JSON.stringify({ challengeId:state.challengeId, code, method:state.selectedLoginMethod, identifier:state.loginIdentifier }) });
      state.challengeId = result.challengeId || state.challengeId;
      state.pendingId = result.pendingId || state.pendingId;
      state.lastError = "";
      state.screen = state.screen === "login-otp" ? "dashboard" : state.screen === "register-email" ? "register-sms" : "mfa";
      render();
    } catch (error) {
      state.lastError = error.message;
      render();
    }
  });
}
modeButtons.forEach((button) => button.addEventListener("click", () => { state.mode = button.dataset.mode; state.screen = button.dataset.mode; state.lastError = ""; modeButtons.forEach((item) => item.classList.toggle("active", item === button)); render(); }));
const googleParams = new URLSearchParams(window.location.search);
if (googleParams.get("googleLogin") === "success") {
  state.screen = "dashboard";
  window.history.replaceState({}, document.title, window.location.pathname);
}
if (googleParams.get("googleError")) state.lastError = "Google sign-in was cancelled or could not be completed.";
render();
