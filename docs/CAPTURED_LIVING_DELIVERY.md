# Delivering a listing

How a Captured Living listing gallery is set up so it shows the design's
deliverables, room filters and MLS links. Everything here is admin settings;
the look comes from `frontend/src/styles/captured-living.css`.

## Once: settings

- **Settings → Photo Categories:** create the rooms as global categories, for
  example Exterior, Living, Kitchen, Dining, Bedrooms, Bathrooms, Twilight,
  Aerial. Remove the wedding defaults you don't use. These become the room
  filter pills under the hero.
- **Settings → Event Creation → Show filter bar in galleries:** on. It shows
  the room pills, and PicPeak's toolbar (search, sort, filters, select) under
  them.
- **Settings → Download resolutions:** standard *Original*, picker on,
  *Offer "Original"* on, one size **Web & MLS** at 2048 × 2048.
- **Branding:** header style *Hero Image*, divider *None*.

## Per listing

1. Name the gallery after the address (*1428 Juniper Ridge Drive*). The name
   is the title in the hero panel.
2. Upload the photos to the gallery root and give each its **room category**.
   The first photo, or the one picked as hero, fills the hero.
3. Create **folders** for the other deliverables and upload into them:
   - **Video**: the walkthrough MP4 (branded)
   - **Floor plan**: the plan as PNG or JPG (galleries don't take PDFs; send
     a PDF through the client portal's Documents if needed)
   - **Aerial**, **Twilight**: optional, if they should be separate
   They show as tiles under the hero, before the room filters.
4. In the gallery's settings, set the **info banner** to *Custom* with the
   links agents need, for example:

   ```markdown
   **Also in this delivery:** [Unbranded video (MLS)](https://…) · [3D tour](https://…) · [Unbranded 3D tour (MLS)](https://…)
   ```

   It shows as a light strip under the top bar with gold links.
5. Assign the agent's **customer account**, so the gallery appears in their
   portal with the *Ready to download* card.
