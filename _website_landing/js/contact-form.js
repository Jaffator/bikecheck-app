// Access key from web3forms.com - messages land in the inbox the key was
// created for. It is meant to be public, so it can live in the page.
var WEB3FORMS_KEY = "2038db51-5adb-4d5b-b30e-ec435a3f4f81";
var WEB3FORMS_URL = "https://api.web3forms.com/submit";

var form = document.querySelector("#contact form");
var status = document.getElementById("cf-status");
var FIELDS = "input:not([name=botcheck]), textarea";
// One message a minute per browser, so a held Enter or a refill doesn't flood the inbox.
var SENT_KEY = "bikecheck-contact-sent";
var COOLDOWN_MS = 60000;

var MESSAGES = {
  cs: {
    required: "Vyplň prosím toto pole",
    email: "Zadej platnou e-mailovou adresu",
    sent: "Díky, zpráva odešla. Ozvu se co nejdřív.",
    failed: "Zprávu se nepodařilo odeslat. Zkus to znovu, nebo napiš na support@bikecheck.cloud.",
    cooldown: "Zpráva už odešla. Další můžeš poslat za minutu.",
  },
  en: {
    required: "Fill in this field",
    email: "Enter a valid email address",
    sent: "Thanks, your message is on its way. I'll reply soon.",
    failed: "The message didn't go through. Try again, or write to support@bikecheck.cloud.",
    cooldown: "Your message is already on its way. You can send another in a minute.",
  },
};

function msg(key) {
  return MESSAGES[root.getAttribute("data-lang")][key];
}

function showError(field, text) {
  var box = field.parentElement.querySelector(".err");
  box.textContent = text;
  box.classList.remove("hidden");
  field.setAttribute("aria-invalid", "true");
  field.classList.add("ring-rust");
}

function clearError(field) {
  var box = field.parentElement.querySelector(".err");
  box.textContent = "";
  box.classList.add("hidden");
  field.removeAttribute("aria-invalid");
  field.classList.remove("ring-rust");
}

function inCooldown() {
  try {
    return Date.now() - Number(localStorage.getItem(SENT_KEY) || 0) < COOLDOWN_MS;
  } catch (e) {
    return false;
  }
}

function markSent() {
  try {
    localStorage.setItem(SENT_KEY, String(Date.now()));
  } catch (e) {}
}

function showStatus(key, failed) {
  status.textContent = msg(key);
  status.classList.toggle("text-sage", !failed);
  status.classList.toggle("text-rust", !!failed);
  status.classList.remove("hidden");
}

if (form) {
  var submitBtn = form.querySelector("button[type=submit]");

  form.querySelectorAll(FIELDS).forEach(function (field) {
    field.addEventListener("input", function () {
      clearError(field);
    });
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    status.classList.add("hidden");

    var fields = Array.prototype.slice.call(form.querySelectorAll(FIELDS));
    var firstBad = null;

    fields.forEach(function (field) {
      clearError(field);
      var value = field.value.trim();

      if (!value) {
        showError(field, msg("required"));
        firstBad = firstBad || field;
      } else if (field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
        showError(field, msg("email"));
        firstBad = firstBad || field;
      }
    });

    if (firstBad) {
      firstBad.focus();
      return;
    }

    // A ticked honeypot is a bot: look successful, send nothing.
    if (form.elements.botcheck.checked) {
      showStatus("sent");
      form.reset();
      return;
    }

    if (inCooldown()) {
      showStatus("cooldown", true);
      return;
    }

    var name = form.elements.name.value.trim();
    submitBtn.disabled = true;
    submitBtn.classList.add("opacity-60", "cursor-wait");

    fetch(WEB3FORMS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        access_key: WEB3FORMS_KEY,
        subject: "BikeCheck web: " + name,
        name: name,
        email: form.elements.email.value.trim(),
        message: form.elements.message.value.trim(),
      }),
    })
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        if (!data.success) throw new Error("rejected");
        // Counted once delivered, not on click: a rejected send is no contact.
        if (window.umami) window.umami.track("contact-sent");
        markSent();
        showStatus("sent");
        form.reset();
      })
      .catch(function () {
        showStatus("failed", true);
      })
      .then(function () {
        submitBtn.disabled = false;
        submitBtn.classList.remove("opacity-60", "cursor-wait");
      });
  });
}
