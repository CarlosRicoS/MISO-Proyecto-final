package com.uniandes.travelhub.app;

import static androidx.test.espresso.web.assertion.WebViewAssertions.webMatches;
import static androidx.test.espresso.web.model.Atoms.getCurrentUrl;
import static androidx.test.espresso.web.webdriver.DriverAtoms.getText;
import static androidx.test.espresso.web.sugar.Web.onWebView;
import static androidx.test.espresso.web.webdriver.DriverAtoms.clearElement;
import static androidx.test.espresso.web.webdriver.DriverAtoms.findElement;
import static androidx.test.espresso.web.webdriver.DriverAtoms.script;
import static androidx.test.espresso.web.webdriver.DriverAtoms.webClick;
import static androidx.test.espresso.web.webdriver.DriverAtoms.webKeys;
import static androidx.test.espresso.web.webdriver.Locator.XPATH;

import androidx.test.ext.junit.rules.ActivityScenarioRule;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.filters.LargeTest;

import org.hamcrest.Matchers;
import org.junit.Rule;
import org.junit.Test;
import org.junit.runner.RunWith;

@RunWith(AndroidJUnit4.class)
@LargeTest
public class TravelHubEspressoTest {

    @Rule
    public ActivityScenarioRule<MainActivity> activityScenarioRule =
            new ActivityScenarioRule<>(MainActivity.class);

    @Test
    public void homePageShowsHeroAndRecommendedHotels() {
        onWebView().forceJavascriptEnabled();

        onWebView()
                .withElement(findElement(XPATH, "//*[contains(text(),'Find Your Perfect Stay')]"))
                .check(webMatches(getText(), Matchers.containsString("Find Your Perfect Stay")));

        onWebView()
                .withElement(findElement(XPATH, "//*[contains(text(),'Recommended Hotels')]"))
                .check(webMatches(getText(), Matchers.containsString("Recommended Hotels")));
    }

    @Test
    public void searchFlowNavigatesToResults() {
        onWebView().forceJavascriptEnabled();

        performSearch("Bogota", "2");

        waitForUrlContains("search-results");
        onWebView().check(webMatches(getCurrentUrl(), Matchers.containsString("search-results")));

        onWebView()
            .withElement(findElement(XPATH, "//*[contains(text(),'Page')]"))
            .check(webMatches(getText(), Matchers.containsString("Page")));
    }

    @Test
    public void propertyDetailPageRendersBookingInformation() {
        onWebView().forceJavascriptEnabled();

        performSearch("Bogota", "2");

        waitForUrlContains("search-results");

        onWebView()
            .withElement(findElement(XPATH, "//ion-button[.//span[contains(text(),'View Details')]]"))
            .perform(webClick());

        waitForUrlContains("propertydetail");

        onWebView()
            .withElement(findElement(XPATH, "//h1"))
            .check(webMatches(getText(), Matchers.not(Matchers.isEmptyOrNullString())));

        onWebView()
            .withElement(findElement(XPATH, "//*[contains(text(),'Book Now')]"))
            .check(webMatches(getText(), Matchers.containsString("Book Now")));
    }

    @Test
    public void searchResultsDirectRouteShowsPageIndicator() {
        onWebView().forceJavascriptEnabled();

        onWebView().perform(script("window.location.href='/search-results?city=Bogota';"));

        waitForUrlContains("search-results");

        onWebView()
            .withElement(findElement(XPATH, "//*[contains(text(),'Page')]"))
            .check(webMatches(getText(), Matchers.containsString("Page")));
    }

    @Test
    public void searchResultsDisplaysViewDetailsCta() {
        onWebView().forceJavascriptEnabled();

        performSearch("Bogota", "2");

        waitForUrlContains("search-results");

        onWebView()
            .withElement(findElement(XPATH, "//*[contains(text(),'View Details')]"))
            .check(webMatches(getText(), Matchers.containsString("View Details")));
    }

    @Test
    public void searchFlowIncludesCityAndCapacityInUrl() {
        onWebView().forceJavascriptEnabled();

        performSearch("Bogota", "2");

        waitForUrlContains("search-results");
        onWebView().check(webMatches(getCurrentUrl(), Matchers.containsString("city=Bogota")));
        onWebView().check(webMatches(getCurrentUrl(), Matchers.containsString("capacity=2")));
    }

    @Test
    public void propertyDetailFlowCanNavigateBackToSearchResults() {
        onWebView().forceJavascriptEnabled();

        performSearch("Bogota", "2");
        waitForUrlContains("search-results");

        onWebView()
            .withElement(findElement(XPATH, "//ion-button[.//span[contains(text(),'View Details')]]"))
            .perform(webClick());

        waitForUrlContains("propertydetail");

        onWebView().perform(script("window.history.back();"));
        waitForUrlContains("search-results");

        onWebView().check(webMatches(getCurrentUrl(), Matchers.containsString("search-results")));
    }

    @Test
    public void searchResultsShowHotelsFoundSummary() {
        onWebView().forceJavascriptEnabled();

        performSearch("Bogota", "2");

        waitForUrlContains("search-results");

        onWebView()
            .withElement(findElement(XPATH, "//*[contains(text(),'hotels found') or contains(text(),'hotel found')]"))
            .check(webMatches(getText(), Matchers.containsString("found")));
    }

    private void performSearch(String city, String guests) {
        onWebView().withElement(findElement(XPATH, "//input[@placeholder='Where are you going?']"))
            .perform(clearElement())
            .perform(webKeys(city));

        onWebView().withElement(findElement(XPATH, "//input[@placeholder='1 Guest']"))
            .perform(clearElement())
            .perform(webKeys(guests));

        onWebView().withElement(findElement(XPATH, "//ion-button[.//span[contains(text(),'Search Hotels')]]"))
            .perform(webClick());
    }

    private void waitForUrlContains(String expectedFragment) {
        long start = System.currentTimeMillis();
        long timeoutMs = 15000;
        AssertionError lastError = null;

        while (System.currentTimeMillis() - start < timeoutMs) {
            try {
                onWebView().check(webMatches(getCurrentUrl(), Matchers.containsString(expectedFragment)));
                return;
            } catch (AssertionError error) {
                lastError = error;
                try {
                    Thread.sleep(300);
                } catch (InterruptedException interruptedException) {
                    Thread.currentThread().interrupt();
                    throw new AssertionError("Interrupted while waiting for URL", interruptedException);
                }
            }
        }

        if (lastError != null) {
            throw lastError;
        }
        throw new AssertionError("URL did not contain expected fragment: " + expectedFragment);
    }
}
