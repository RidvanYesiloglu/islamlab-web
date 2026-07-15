# islamlab.org

Source for the **Islam Lab** website — a projects hub for the lab's open research, models, and tools. A static site served on **GitHub Pages** at **[islamlab.org](https://islamlab.org)**.

> The lab's official page is at Stanford Medicine: <https://med.stanford.edu/islam-lab.html>. This site collects our open projects.

## Live

- **Home** — https://islamlab.org
- **scVision** — https://islamlab.org/scvision · a vision foundation model for single-cell biology

## Structure

```
index.html          # Home (projects hub)
scvision/           # scVision project page
  index.html
  style.css
  assets/fig1.png
CNAME               # Custom domain: islamlab.org
.nojekyll           # Serve files as-is (no Jekyll)
```

Each project lives in its own folder and is served at `islamlab.org/<project>`. Plain HTML/CSS — no build step.

## Deploy (GitHub Pages + custom domain)

1. Push to `main`.
2. **Settings → Pages** → deploy from `main` / root.
3. At the DNS registrar, point the apex `islamlab.org` to GitHub Pages:
   ```
   A  @  185.199.108.153
   A  @  185.199.109.153
   A  @  185.199.110.153
   A  @  185.199.111.153
   ```
4. Once the certificate is issued, enable **Enforce HTTPS**.

The `CNAME` file already sets the custom domain, so after setup a push is all it takes.

## Add a new project

1. Create `<project>/index.html` (plus any assets) — it will serve at `islamlab.org/<project>`.
2. Add a card to the home page (`index.html`) by copying the scVision card and updating the title, thumbnail, and link.
3. Commit and push.

## Credits

Islam Lab · Department of Radiation Oncology, Stanford University School of Medicine.
Contact: [tauhid@stanford.edu](mailto:tauhid@stanford.edu)
