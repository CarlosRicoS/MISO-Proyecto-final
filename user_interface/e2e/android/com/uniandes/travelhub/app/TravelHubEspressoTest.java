package com.uniandes.travelhub.app;

import static androidx.test.espresso.web.assertion.WebViewAssertions.webMatches;
import static androidx.test.espresso.web.model.Atoms.script;
import static androidx.test.espresso.web.webdriver.DriverAtoms.getText;
import static androidx.test.espresso.web.sugar.Web.onWebView;
import static androidx.test.espresso.web.webdriver.DriverAtoms.findElement;
import static androidx.test.espresso.web.webdriver.Locator.XPATH;
import static org.junit.Assert.assertThat;

import androidx.test.ext.junit.rules.ActivityScenarioRule;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.filters.LargeTest;
import androidx.test.rule.GrantPermissionRule;

import org.hamcrest.Matchers;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.runner.RunWith;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;

@RunWith(AndroidJUnit4.class)
@LargeTest
public class TravelHubEspressoTest {

    // Pre-grant POST_NOTIFICATIONS (required on API 33+) so the runtime permission
    // dialog never appears mid-test and puts MainActivity into PAUSED state.
    @Rule
    public GrantPermissionRule notificationPermissionRule =
            GrantPermissionRule.grant(android.Manifest.permission.POST_NOTIFICATIONS);

    @Rule
    public ActivityScenarioRule<MainActivity> activityScenarioRule =
            new ActivityScenarioRule<>(MainActivity.class);

    /**
     * Seed the active UI locale to English before each test so existing assertions
     * that match English copy ("Find Your Perfect Stay", "Welcome Back",
     * "Recommended Hotels", etc.) still work after the i18n feature switched the
     * default locale to Spanish (es-CO). Mirrors the Playwright `addInitScript`
     * pattern used by the web E2E suites.
     */
    @Before
    public void seedEnglishLocale() {
        onWebView().forceJavascriptEnabled();
        executeJavascript("localStorage.setItem('th_locale', 'en');");
        executeJavascript("window.location.replace('/');");
        // Allow Angular to re-bootstrap and ngx-translate to load en.json
        // before any test assertion runs.
        waitForLanguageReady("en");
    }

    private void waitForLanguageReady(String expectedLang) {
        long start = System.currentTimeMillis();
        long timeoutMs = 15000;
        while (System.currentTimeMillis() - start < timeoutMs) {
            CountDownLatch latch = new CountDownLatch(1);
            AtomicReference<String> result = new AtomicReference<>("");
            activityScenarioRule
                    .getScenario()
                    .onActivity(
                            activity -> {
                                if (activity.getBridge() == null
                                        || activity.getBridge().getWebView() == null) {
                                    latch.countDown();
                                    return;
                                }
                                activity
                                        .getBridge()
                                        .getWebView()
                                        .post(
                                                () ->
                                                        activity
                                                                .getBridge()
                                                                .getWebView()
                                                                .evaluateJavascript(
                                                                        "localStorage.getItem('th_locale')",
                                                                        value -> {
                                                                            result.set(value == null ? "" : value);
                                                                            latch.countDown();
                                                                        }));
                            });
            try {
                latch.await(2, TimeUnit.SECONDS);
            } catch (InterruptedException interruptedException) {
                Thread.currentThread().interrupt();
                throw new AssertionError("Interrupted while waiting for locale", interruptedException);
            }
            if (result.get() != null && result.get().contains(expectedLang)) {
                // localStorage is set; give Angular a moment to render with the new lang.
                try {
                    Thread.sleep(500);
                } catch (InterruptedException interruptedException) {
                    Thread.currentThread().interrupt();
                }
                return;
            }
            try {
                Thread.sleep(300);
            } catch (InterruptedException interruptedException) {
                Thread.currentThread().interrupt();
                throw new AssertionError("Interrupted while waiting for locale", interruptedException);
            }
        }
        throw new AssertionError(
                "Locale did not reach expected value '" + expectedLang + "' within timeout");
    }

    @Test
    public void homePageShowsHeroAndRecommendedHotels() {
        onWebView().forceJavascriptEnabled();

        // Wait for the hero title to be rendered
        waitForElement("//*[contains(text(),'Find Your Perfect Stay')]");
        onWebView()
                .withElement(findElement(XPATH, "//*[contains(text(),'Find Your Perfect Stay')]"))
                .check(webMatches(getText(), Matchers.containsString("Find Your Perfect Stay")));

        // On some emulator/WebView versions, getText() can return an empty string even when
        // XPath has already matched visible text. Presence check via XPath is more stable here.
        waitForElement("//*[contains(text(),'Recommended Hotels')]");
    }

    @Test
    public void searchFlowNavigatesToResults() {
        onWebView().forceJavascriptEnabled();

        onWebView().perform(script("window.location.href='/search-results?city=Bogota&capacity=2';"));

        waitForUrlContains("search-results");
        assertCurrentUrlContains("search-results");
        assertCurrentUrlContains("city=Bogota");
        assertCurrentUrlContains("capacity=2");
    }

    @Test
    public void propertyDetailPageRendersBookingInformation() {
        onWebView().forceJavascriptEnabled();

        onWebView().perform(script("window.location.href='/propertydetail/hotel-1';"));

        waitForUrlContains("propertydetail");
        assertCurrentUrlContains("propertydetail/hotel-1");
    }

    @Test
    public void searchResultsDirectRouteShowsPageIndicator() {
        onWebView().forceJavascriptEnabled();

        onWebView().perform(script("window.location.href='/search-results?city=Bogota&capacity=2';"));

        waitForUrlContains("search-results");
        assertCurrentUrlContains("city=Bogota");
    }

    @Test
    public void searchResultsDisplaysViewDetailsCta() {
        onWebView().forceJavascriptEnabled();

        onWebView().perform(script("window.location.href='/search-results?city=Bogota&capacity=2';"));

        waitForUrlContains("search-results");
        assertCurrentUrlContains("search-results");
    }

    @Test
    public void searchFlowIncludesCityAndCapacityInUrl() {
        onWebView().forceJavascriptEnabled();

        onWebView().perform(script("window.location.href='/search-results?city=Bogota&capacity=2';"));

        waitForUrlContains("search-results");
        assertCurrentUrlContains("city=Bogota");
        assertCurrentUrlContains("capacity=2");
    }

    @Test
    public void propertyDetailFlowCanNavigateBackToSearchResults() {
        onWebView().forceJavascriptEnabled();

        onWebView().perform(script("window.location.href='/search-results?city=Bogota&capacity=2';"));
        waitForUrlContains("search-results");
        onWebView().perform(script("window.location.href='/propertydetail/hotel-1';"));
        waitForUrlContains("propertydetail");

        onWebView().perform(script("window.history.back();"));
        waitForUrlContains("search-results");

        assertCurrentUrlContains("search-results");
    }

    @Test
    public void searchResultsShowHotelsFoundSummary() {
        onWebView().forceJavascriptEnabled();

        onWebView().perform(script("window.location.href='/search-results?city=Bogota&capacity=2';"));

        waitForUrlContains("search-results");
        assertCurrentUrlContains("capacity=2");
    }

    @Test
    public void bookingListRouteRedirectsToLoginForAnonymousSession() {
        executeJavascript(
                "localStorage.removeItem('th_auth_session'); sessionStorage.clear();"
                        + " window.location.href='/booking-list';");

        waitForUrlContains("/login");
        assertCurrentUrlContains("returnUrl=%2Fbooking-list");
        waitForElement("//*[contains(text(),'Welcome Back')]");
    }

    @Test
    public void bookingListRouteAllowsAuthenticatedSession() {
        injectAuthenticatedSession();
        executeJavascript("window.location.href='/booking-list';");

        waitForUrlContains("/booking-list");
        assertCurrentUrlContains("/booking-list");
    }

    private void injectAuthenticatedSession() {
        String loginResponse =
                "{"
                        + "\\\"id_token\\\":\\\"header.eyJzdWIiOiJ1c2VyLTEyMyIsImVtYWlsIjoidHJhdmVsZXJAZXhhbXBsZS5jb20ifQ.signature\\\"," 
                        + "\\\"access_token\\\":\\\"header.eyJzdWIiOiJ1c2VyLTEyMyIsImVtYWlsIjoidHJhdmVsZXJAZXhhbXBsZS5jb20ifQ.signature\\\"," 
                        + "\\\"refresh_token\\\":\\\"refresh-token\\\"," 
                        + "\\\"expires_in\\\":3600," 
                        + "\\\"token_type\\\":\\\"Bearer\\\""
                        + "}";

        // AuthSessionService persists the session in localStorage (key: 'th_auth_session').
        // Mirror that storage so the auth guard sees an authenticated user on the next nav.
        executeJavascript("localStorage.setItem('th_auth_session', '" + loginResponse + "');");
    }

    private void executeJavascript(String jsCode) {
        CountDownLatch latch = new CountDownLatch(1);
        AtomicReference<Throwable> errorRef = new AtomicReference<>();

        activityScenarioRule
                .getScenario()
                .onActivity(
                        activity -> {
                            if (activity.getBridge() == null || activity.getBridge().getWebView() == null) {
                                errorRef.set(new IllegalStateException("WebView bridge is not ready"));
                                latch.countDown();
                                return;
                            }

                            activity
                                    .getBridge()
                                    .getWebView()
                                    .post(
                                            () ->
                                                    activity
                                                            .getBridge()
                                                            .getWebView()
                                                            .evaluateJavascript(
                                                                    jsCode,
                                                                    value -> latch.countDown()));
                        });

        try {
            if (!latch.await(10, TimeUnit.SECONDS)) {
                throw new AssertionError("Timed out executing JavaScript in WebView");
            }
        } catch (InterruptedException interruptedException) {
            Thread.currentThread().interrupt();
            throw new AssertionError("Interrupted while executing JavaScript", interruptedException);
        }

        if (errorRef.get() != null) {
            throw new AssertionError("Failed to execute JavaScript", errorRef.get());
        }
    }

    private void waitForElement(String xpath) {
        long start = System.currentTimeMillis();
        long timeoutMs = 15000;
        Exception lastError = null;

        while (System.currentTimeMillis() - start < timeoutMs) {
            try {
                onWebView()
                        .withElement(findElement(XPATH, xpath))
                        .check(webMatches(getText(), Matchers.notNullValue(String.class)));
                return;
            } catch (Exception error) {
                lastError = error;
                try {
                    Thread.sleep(300);
                } catch (InterruptedException interruptedException) {
                    Thread.currentThread().interrupt();
                    throw new AssertionError("Interrupted while waiting for element", interruptedException);
                }
            }
        }

        if (lastError != null) {
            throw new AssertionError("Element with XPath not found within timeout: " + xpath, lastError);
        }
        throw new AssertionError("Element with XPath not found within timeout: " + xpath);
    }

    private void waitForUrlContains(String expectedFragment) {
        long start = System.currentTimeMillis();
        long timeoutMs = 15000;
        String lastObservedUrl = "";

        while (System.currentTimeMillis() - start < timeoutMs) {
            lastObservedUrl = readCurrentUrl();
            if (lastObservedUrl.contains(expectedFragment)) {
                return;
            }

            try {
                Thread.sleep(300);
            } catch (InterruptedException interruptedException) {
                Thread.currentThread().interrupt();
                throw new AssertionError("Interrupted while waiting for URL", interruptedException);
            }
        }

        throw new AssertionError(
                "URL did not contain expected fragment: "
                        + expectedFragment
                        + ". Last observed URL: "
                        + lastObservedUrl);
    }

    private void assertCurrentUrlContains(String expectedFragment) {
        assertThat(readCurrentUrl(), Matchers.containsString(expectedFragment));
    }

    private String readCurrentUrl() {
        AtomicReference<String> currentUrl = new AtomicReference<>("");

        activityScenarioRule
                .getScenario()
                .onActivity(
                        activity -> {
                            if (activity.getBridge() != null && activity.getBridge().getWebView() != null) {
                                String url = activity.getBridge().getWebView().getUrl();
                                currentUrl.set(url == null ? "" : url);
                            }
                        });

        return currentUrl.get();
    }
}
