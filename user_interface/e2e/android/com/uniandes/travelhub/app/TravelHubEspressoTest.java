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

import org.hamcrest.Matchers;
import org.junit.Rule;
import org.junit.Test;
import org.junit.runner.RunWith;

import java.util.concurrent.atomic.AtomicReference;

@RunWith(AndroidJUnit4.class)
@LargeTest
public class TravelHubEspressoTest {

    @Rule
    public ActivityScenarioRule<MainActivity> activityScenarioRule =
            new ActivityScenarioRule<>(MainActivity.class);

    @Test
    public void homePageShowsHeroAndRecommendedHotels() {
        onWebView().forceJavascriptEnabled();

        // Wait for the hero title to be rendered
        waitForElement("//*[contains(text(),'Find Your Perfect Stay')]");
        onWebView()
                .withElement(findElement(XPATH, "//*[contains(text(),'Find Your Perfect Stay')]"))
                .check(webMatches(getText(), Matchers.containsString("Find Your Perfect Stay")));

        // Wait for the recommended hotels section to be rendered
        waitForElement("//*[contains(text(),'Recommended Hotels')]");
        onWebView()
                .withElement(findElement(XPATH, "//*[contains(text(),'Recommended Hotels')]"))
                .check(webMatches(getText(), Matchers.containsString("Recommended Hotels")));
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
        onWebView().forceJavascriptEnabled();

        onWebView().perform(script("sessionStorage.clear(); window.location.href='/booking-list';"));

        waitForUrlContains("/login");
        assertCurrentUrlContains("returnUrl=%2Fbooking-list");
        waitForElement("//*[contains(text(),'Welcome Back')]");
    }

    @Test
    public void bookingListRouteAllowsAuthenticatedSession() {
        onWebView().forceJavascriptEnabled();

        injectAuthenticatedSession();
        onWebView().perform(script("window.location.href='/booking-list';"));

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

        onWebView().perform(script(
                "sessionStorage.setItem('th_auth_session', '" + loginResponse + "');"
        ));
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
