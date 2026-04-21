/**
 * Gensokyo.sys Configuration File
 * 
 * You can modify this file to customize the game experience.
 * This approach prevents any SSRF or Path Traversal vulnerabilities 
 * because the data is loaded directly into the client-side JavaScript 
 * without requiring server-side path resolution or external API calls.
 */
const GensokyoConfig = {
    // Custom Sprites (PNG/JPG)
    // Place your custom images in the same folder and update these filenames,
    // or just name your images 'player.png' and 'villain.png'.
    // The game will automatically fall back to geometric shapes if they aren't found.
    playerSpritePath: 'player.png',
    villainSpritePath: 'villain.png',

    // Win Reward Settings (Safe from server-side exploitation)
    flagFileName: 'lunatic_flag.txt',
    flagContent: 'FLAG{M45T3R_0F_LUN4T1C_D0DG35_N0_3XPL01T5_N33D3D}'
};
