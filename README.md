
# ILM The Contest Center

A responsive static HTML/CSS/JavaScript website with Supabase Auth and database integration.

## Pages
Home, About, Programs, Olympiads, Contests, Results, Certificates, Contact, Student Login, Student Registration, Student Portal and Admin Portal.

## Setup checklist
1. Open the Supabase project connected in `supabase.js`.
2. In Supabase Dashboard, open **SQL Editor** and run the complete script in `database/setup.sql`.
3. In **Authentication → URL Configuration**, add your deployed website URL to Site URL and Redirect URLs. For GitHub Pages this is normally `https://YOUR-USERNAME.github.io/ilm-the-contest-center/`.
4. Enable email/password sign-in. Review email confirmation settings and configure an email provider before public launch.
5. Register your own account from the website, confirm your email, then sign in.
6. In Supabase SQL Editor, grant the owner account administrator access:
   `update public.profiles set role='admin' where email='YOUR-ADMIN-EMAIL';`
   Replace the placeholder with the exact email you registered with. Never let users choose their own role.
7. Publish the repository with GitHub Pages: Settings → Pages → Deploy from a branch → main (or merge this branch first) → /(root).

## Security
- The browser uses a Supabase publishable key. This key is public by design.
- Never put a Supabase secret or service-role key in HTML, JavaScript, GitHub Pages, or any browser code.
- Database access is protected with Row Level Security. Review the policies before storing real student data.
- Student accounts can only read their own profile and certificates; published results are public by registration number.
- Admin permissions are granted manually by the project owner in Supabase, never through registration metadata.

## Important before launch
- Add your final prospectus dates, eligibility, fee and prize details to the programme pages only after confirming them.
- Test sign-up, email confirmation, login, password reset, student portal, admin portal, results and certificate verification.
- Configure a trusted email sender and test spam delivery.
- Use HTTPS and keep student data limited to what the service needs.
