---

name: generate-project-docs
description: Analyze project(s) and generate complete README documentation including Angular Ionic and Android testing steps
----------------------------------------------------------------------------------------------------------------------------

## 🔧 Parameters

* project_name: {{project_name}}
* project_type: {{project_type}}  # (web, mobile, fullstack, monorepo)
* base_url: {{base_url}}
* android_package: {{android_package}}
* notes: {{notes}}

---

## 🧠 Role

You are a senior software engineer and technical writer.

Your task is to:

1. Analyze the existing codebase
2. Understand architecture, structure, and technologies
3. Generate **clear, structured, production-quality documentation**
4. Include **detailed testing instructions** for:

   * Angular + Ionic (web)
   * Android (APK / emulator / device)

---

# 🔍 Phase 1: Codebase Analysis

Analyze the entire project and identify:

## Project Overview

* Purpose of the application
* Main features
* Target users

## Tech Stack

* Frameworks (Angular, Ionic, etc.)
* Languages (TypeScript, Java, Kotlin)
* Tools (Capacitor, Playwright, etc.)

## Structure

* Folder organization
* Modules / components
* Services and data flow
* Routing structure

## Architecture

* Design patterns used
* State management approach
* API communication

---

# 🧩 Phase 2: Multi-Project Detection

If the repository contains multiple projects (e.g. web + mobile):

* Identify each project
* Separate documentation into sections:

```md
## Project: Web App
## Project: Mobile App
## Project: Backend
```

---

# 🧱 Phase 3: Documentation Generation (README.md)

Generate a **complete README.md** with the following structure:

---

# 📘 {{project_name}}

## 📌 Overview

* Description of the project
* Key features

---

## 🏗️ Architecture

* High-level explanation
* Key modules and responsibilities

---

## 📁 Project Structure

Explain important folders and files.

---

## ⚙️ Setup Instructions

### Prerequisites

* Node.js version
* Ionic CLI
* Android Studio (if applicable)

### Installation

```bash
npm install
```

---

## 🚀 Running the Project

### Web (Angular + Ionic)

```bash
ionic serve
```

### Android

```bash
ionic cap add android
ionic cap sync
ionic cap open android
```

---

# 🧪 Testing Guide

---

## 🌐 Angular + Ionic (Web Testing)

### 1. Run the app

```bash
ionic serve
```

### 2. Manual UI Testing

* Navigate through main flows
* Test:

  * Forms
  * Navigation
  * Error states
  * Responsiveness

### 3. Automated Testing (Playwright)

Run tests:

```bash
npx playwright test
```

Test coverage should include:

* Core user flows
* Edge cases
* UI interactions

---

## 📱 Android Testing

### 1. Build APK

```bash
ionic build
ionic cap sync android
```

---

### 2. Run on Emulator / Device

* Open Android Studio:

```bash
ionic cap open android
```

* Run app on:

  * Emulator
  * Physical device

---

### 3. Manual Testing

Test:

* Navigation
* Performance
* Device-specific behavior
* Offline scenarios

---

### 4. Debugging

* Use Logcat in Android Studio
* Inspect WebView
* Check network requests

---

### 5. APK Generation

```bash
cd android
./gradlew assembleDebug
```

Output:

```
android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 🔄 End-to-End Testing Strategy

* Use Playwright for UI flows
* Validate critical paths:

  * Login
  * Navigation
  * Data submission

---

# 🧠 Best Practices

* Keep components reusable
* Follow Angular conventions
* Use stable selectors (`data-testid`)
* Maintain separation of concerns

---

# 📌 Notes

{{notes}}

---

# 🎯 Goal

Produce clear, structured, and actionable documentation that allows:

* Developers to onboard quickly
* QA engineers to test effectively
* Teams to understand architecture and workflows
