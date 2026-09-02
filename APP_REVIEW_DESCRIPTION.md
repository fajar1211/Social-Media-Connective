# Facebook App Review - Use Case Description

## App Information
- **App Name**: Social Media Connective
- **App ID**: 1109449551768527
- **App URL**: https://socmed.marketingconnective.com
- **Category**: Business Management Tool

## App Description

Social Media Connective is a social media content management platform that helps businesses and marketing teams manage their Facebook Pages efficiently. The app allows users to:

1. Connect multiple Facebook Pages to a single dashboard
2. Create, schedule, and publish content directly to their pages
3. View page performance and engagement metrics
4. Manage content across multiple pages from one place

## Use Case: Page Management

### How the app uses Facebook Login

Our app uses Facebook Login to allow users to securely connect their Facebook Pages. Once connected, the app can:

1. **Display available pages** - Show users which Facebook Pages they manage
2. **Publish content** - Create posts on behalf of the user to their selected pages
3. **View engagement** - Read post performance data to help users understand their audience

### Permissions Requested

#### 1. `pages_show_list`
**Why needed**: To display the list of Facebook Pages that the user manages, allowing them to select which page to connect to the app.

**How it's used**: When a user connects their Facebook account, we call the Graph API to retrieve their pages. This permission allows us to show the user a list of their available pages so they can choose which one to connect.

**User benefit**: Users can see and select from all their managed pages without leaving the app.

#### 2. `pages_read_engagement`
**Why needed**: To read engagement metrics (likes, comments, shares) on posts published through our app, helping users understand their content performance.

**How it's used**: After content is published, we retrieve engagement data to display in the app's analytics dashboard. This includes post reach, reactions, comments, and shares.

**User benefit**: Users can track how their content performs and make data-driven decisions about their social media strategy.

#### 3. `pages_manage_posts`
**Why needed**: To create, edit, and delete posts on the user's selected Facebook Pages.

**How it's used**: When a user creates content in our app and clicks "Publish", we use this permission to create the post on their Facebook Page. Users can also schedule posts for later publication.

**User benefit**: Users can manage their entire content workflow from planning to publishing without switching between multiple tools.

#### 4. `business_management`
**Why needed**: To access the user's Business Manager settings and manage page assignments within their business portfolio.

**How it's used**: This permission allows us to properly associate pages with the correct business accounts and ensure proper access control.

**User benefit**: Businesses with multiple pages and team members can manage access permissions efficiently.

## Data Usage

- **We do NOT sell user data** to third parties
- **We do NOT use data for advertising** or marketing purposes
- **We do NOT share data** with other applications
- **Data is stored securely** and only used to provide the service requested by the user
- **Users can disconnect** their Facebook account at any time, which removes all stored tokens

## Video/Screenshot Description

[If you have a video or screenshot, describe it here]

Example: "This video shows a user connecting their Facebook Page, creating a post in the content editor, and publishing it to their page. The post appears on their Facebook Page within seconds."

## Compliance

- We comply with Facebook's Platform Terms and Developer Policies
- We have a clear Privacy Policy at https://socmed.marketingconnective.com/privacy
- We provide users with the ability to disconnect and delete their data
- We only request permissions that are necessary for the app's functionality
